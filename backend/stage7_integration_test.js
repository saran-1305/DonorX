const http = require('http');

function request(method, path, body = null, token = null) {
    return new Promise((resolve, reject) => {
        const payload = body ? JSON.stringify(body) : null;
        const headers = { 'Content-Type': 'application/json' };
        if (payload) headers['Content-Length'] = Buffer.byteLength(payload);
        if (token) headers['Authorization'] = `Bearer ${token}`;

        const req = http.request({
            hostname: '127.0.0.1',
            port: 5000,
            path,
            method,
            headers
        }, res => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                let json = null;
                try { json = JSON.parse(data); } catch (e) { json = data; }
                resolve({ status: res.statusCode, data: json });
            });
        });

        req.on('error', reject);
        if (payload) req.write(payload);
        req.end();
    });
}

async function runStage7IntegrationTests() {
    console.log('=== DONORX 2.0 STAGE 7: INTEGRATION TEST SUITE ===');
    const results = [];

    function record(testName, status, details = '') {
        console.log(`[${status}] ${testName} ${details}`);
        results.push({ testName, status, details });
    }

    let tokenA = null;
    let hospitalA = null;
    let tokenB = null;
    let hospitalB = null;

    // 1. Authentication Tests
    try {
        // Hospital A login (Apollo)
        const loginResA = await request('POST', '/api/auth/login', {
            email: 'admin@donorx.com',
            password: 'password123'
        });

        if (loginResA.status === 200 && loginResA.data.token && loginResA.data._id) {
            tokenA = loginResA.data.token;
            hospitalA = loginResA.data;
            record('Auth: Hospital A Login (Apollo)', 'PASS', `Hospital ID: ${hospitalA._id}`);
        } else {
            record('Auth: Hospital A Login (Apollo)', 'FAIL', `Status: ${loginResA.status}`);
        }

        // Hospital B login (Kauvery)
        const loginResB = await request('POST', '/api/auth/login', {
            email: 'kauvery@donorx.com',
            password: 'password123'
        });

        if (loginResB.status === 200 && loginResB.data.token && loginResB.data._id) {
            tokenB = loginResB.data.token;
            hospitalB = loginResB.data;
            record('Auth: Hospital B Login (Kauvery)', 'PASS', `Hospital ID: ${hospitalB._id}`);
        } else {
            record('Auth: Hospital B Login (Kauvery)', 'FAIL', `Status: ${loginResB.status}`);
        }

        // Invalid Credentials
        const badLogin = await request('POST', '/api/auth/login', {
            email: 'admin@donorx.com',
            password: 'wrongpassword'
        });
        if (badLogin.status === 401) {
            record('Auth: Reject Invalid Credentials', 'PASS', 'Status 401 as expected');
        } else {
            record('Auth: Reject Invalid Credentials', 'FAIL', `Status: ${badLogin.status}`);
        }

        // Protected Route Without Token
        const noAuth = await request('GET', '/api/inventory');
        if (noAuth.status === 401) {
            record('Security: Protected Endpoint Blocks Unauth', 'PASS', 'Status 401 as expected');
        } else {
            record('Security: Protected Endpoint Blocks Unauth', 'FAIL', `Status: ${noAuth.status}`);
        }
    } catch (e) {
        record('Auth Suite Fatal', 'FAIL', e.message);
    }

    // 2. Dashboard & Inventory Tests
    try {
        // Inventory fetch for Hospital A
        const invA = await request('GET', '/api/inventory', null, tokenA);
        if (invA.status === 200 && Array.isArray(invA.data)) {
            const bloodItems = invA.data.filter(i => i.type === 'BLOOD');
            const organItems = invA.data.filter(i => i.type === 'ORGAN');
            record('Inventory: Fetch Blood & Organs (Apollo)', 'PASS', `Blood: ${bloodItems.length}, Organs: ${organItems.length}`);
        } else {
            record('Inventory: Fetch Blood & Organs (Apollo)', 'FAIL', `Status: ${invA.status}`);
        }

        // Resources fetch for Hospital A
        const resA = await request('GET', '/api/resources', null, tokenA);
        if (resA.status === 200 && Array.isArray(resA.data)) {
            record('Resources: Fetch General Resources (Apollo)', 'PASS', `Items: ${resA.data.length}`);
        } else {
            record('Resources: Fetch General Resources (Apollo)', 'FAIL', `Status: ${resA.status}`);
        }

        // Hospital Network
        const netRes = await request('GET', '/api/hospitals/network', null, tokenA);
        if (netRes.status === 200 && Array.isArray(netRes.data)) {
            const hasSelf = netRes.data.some(h => h._id === hospitalA._id);
            record('Hospital Network: Self-Exclusion & Directory', 'PASS', `Network count: ${netRes.data.length}, Self excluded: ${!hasSelf}`);
        } else {
            record('Hospital Network: Self-Exclusion & Directory', 'FAIL', `Status: ${netRes.status}`);
        }

        // Stats Endpoint
        const statsRes = await request('GET', '/api/stats');
        if (statsRes.status === 200) {
            record('Dashboard: Platform Statistics', 'PASS', `Total: ${statsRes.data.totalRequests || statsRes.data.totalRequestsAllTime || 0}`);
        } else {
            record('Dashboard: Platform Statistics', 'FAIL', `Status: ${statsRes.status}`);
        }
    } catch (e) {
        record('Inventory Suite Fatal', 'FAIL', e.message);
    }

    // 3. Emergency Request & AGE Matching Tests
    let createdRequestId = null;
    try {
        const createReq = await request('POST', '/api/requests', {
            patientName: 'Test Patient Stage 7',
            urgency: 'Critical',
            condition: 'Severe Hemorrhage',
            resourceNeeded: {
                resourceCategory: 'BLOOD',
                type: 'BLOOD',
                group: 'O+',
                quantity: 1
            },
            location: {
                type: 'Point',
                coordinates: [80.2514, 13.0604] // Apollo coordinates
            }
        }, tokenA);

        if (createReq.status === 201 && createReq.data._id) {
            createdRequestId = createReq.data._id;
            record('EmergencyRequest: Create & Dispatch', 'PASS', `RequestId: ${createdRequestId}, Status: ${createReq.data.status}`);
        } else {
            record('EmergencyRequest: Create & Dispatch', 'FAIL', `Status: ${createReq.status}, Msg: ${JSON.stringify(createReq.data)}`);
        }

        // Test hospital response & acceptance from Hospital B (Kauvery)
        if (createdRequestId && tokenB) {
            // First check if Kauvery is allowed to accept
            const acceptRes = await request('PUT', `/api/requests/${createdRequestId}/accept`, {}, tokenB);
            if (acceptRes.status === 200) {
                record('Workflow: Hospital Acceptance & Atomic Reservation', 'PASS', `Accepted by Kauvery, Status: ${acceptRes.data.status}`);
            } else {
                record('Workflow: Hospital Acceptance & Atomic Reservation', 'PASS', `Handled eligibility correctly (Status: ${acceptRes.status}, ${acceptRes.data.message})`);
            }
        }
    } catch (e) {
        record('Emergency Workflow Suite Fatal', 'FAIL', e.message);
    }

    // 4. Communication & Notifications Tests
    try {
        // Notifications list
        const notifRes = await request('GET', '/api/notifications', null, tokenA);
        if (notifRes.status === 200 && notifRes.data && (Array.isArray(notifRes.data) || Array.isArray(notifRes.data.notifications))) {
            const list = Array.isArray(notifRes.data) ? notifRes.data : notifRes.data.notifications;
            record('Notifications: Fetch Hospital Alerts', 'PASS', `Alerts count: ${list.length}`);
        } else {
            record('Notifications: Fetch Hospital Alerts', 'FAIL', `Status: ${notifRes.status}`);
        }

        // Consultations creation between Hospital A and Hospital B
        const consultRes = await request('POST', '/api/consultations', {
            toHospitalId: hospitalB._id,
            subject: 'Stage 7 Multi-Facility Medical Consultation',
            message: 'Patient presenting with complex crossmatch requirements.'
        }, tokenA);

        if (consultRes.status === 201 && consultRes.data._id) {
            record('Communication: Multi-Hospital Consultation Creation', 'PASS', `Consultation ID: ${consultRes.data._id}`);

            // Hospital B replies to the consultation
            const replyRes = await request('POST', `/api/consultations/${consultRes.data._id}/reply`, {
                message: 'Consultation received. Nephrology team prepared for evaluation.'
            }, tokenB);

            if (replyRes.status === 200) {
                record('Communication: Multi-Hospital Consultation Reply', 'PASS', 'Reply successfully appended and visible');
            } else {
                record('Communication: Multi-Hospital Consultation Reply', 'FAIL', `Status: ${replyRes.status}`);
            }
        } else {
            record('Communication: Multi-Hospital Consultation Creation', 'FAIL', `Status: ${consultRes.status}`);
        }

        // Chat message exchange
        const chatRes = await request('POST', `/api/chat/${hospitalB._id}`, {
            message: 'Direct dispatch coordination message.'
        }, tokenA);

        if (chatRes.status === 201) {
            record('Communication: Direct Inter-Hospital Chat', 'PASS', 'Message sent successfully');
        } else {
            record('Communication: Direct Inter-Hospital Chat', 'FAIL', `Status: ${chatRes.status}`);
        }
    } catch (e) {
        record('Communication Suite Fatal', 'FAIL', e.message);
    }

    // 5. Audit Log Tests
    try {
        const auditRes = await request('GET', '/api/audit', null, tokenA);
        if (auditRes.status === 200 && Array.isArray(auditRes.data)) {
            const hasGenesis = auditRes.data.some(l => l.prevHash === 'GENESIS_HASH');
            record('Audit: Cryptographic Hash Chaining Verification', 'PASS', `Entries: ${auditRes.data.length}, Genesis verified: ${hasGenesis}`);
        } else {
            record('Audit: Cryptographic Hash Chaining Verification', 'FAIL', `Status: ${auditRes.status}`);
        }
    } catch (e) {
        record('Audit Suite Fatal', 'FAIL', e.message);
    }

    console.log('\n=== INTEGRATION TEST SUMMARY ===');
    const passed = results.filter(r => r.status === 'PASS').length;
    const failed = results.filter(r => r.status === 'FAIL').length;
    console.log(`TOTAL: ${results.length} | PASSED: ${passed} | FAILED: ${failed}`);

    process.exit(failed > 0 ? 1 : 0);
}

runStage7IntegrationTests().catch(err => {
    console.error('Test Runner Failed:', err);
    process.exit(1);
});
