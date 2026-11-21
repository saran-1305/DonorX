const cron = require('node-cron');
const { EmergencyRequest, OrganInventory, AuditLog } = require('../models');
const workflowService = require('../services/workflowService');

const startScheduler = () => {
    cron.schedule('*/1 * * * *', async () => {
        console.log('Running Workflow Scheduler...');

        const now = new Date();
        const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);

        try {
            const requestsToExpand = await EmergencyRequest.find({
                status: 'Generated',
                updatedAt: { $lt: fiveMinutesAgo },
            });

            for (const req of requestsToExpand) {
                console.log(`Expanding radius for request ${req._id}`);
                await workflowService.expandSearchRadius(req._id);
            }

            // Non-destructive Organ Viability Monitoring (Transitions to NON_VIABLE without deleting records)
            const expiredOrgans = await OrganInventory.find({
                status: 'AVAILABLE',
                ischemiaDeadline: { $ne: null, $lt: now },
            });

            for (const organ of expiredOrgans) {
                organ.status = 'NON_VIABLE';
                organ.discardReason = 'COLD_ISCHEMIA_EXCEEDED';
                organ.discardLoggedAt = now;
                await organ.save();

                await AuditLog.create({
                    action: 'ORGAN_MARKED_NON_VIABLE',
                    hospitalId: organ.hospitalId,
                    payload: { organType: organ.organType, ischemiaDeadline: organ.ischemiaDeadline },
                    prevHash: 'SYSTEM_SCHEDULER',
                    hash: 'SCHEDULER_HASH_' + Date.now(),
                });
            }
        } catch (error) {
            console.error('Scheduler Error:', error);
        }
    });

    cron.schedule('*/3 * * * *', async () => {
        console.log('Running Timeout Scheduler...');

        const now = new Date();
        const threeMinutesAgo = new Date(now.getTime() - 3 * 60 * 1000);

        try {
            const timedOutRequests = await EmergencyRequest.find({
                status: 'Generated',
                potentialMatches: { $exists: true, $not: { $size: 0 } },
                updatedAt: { $lt: threeMinutesAgo },
            });

            for (const req of timedOutRequests) {
                console.log(`Handling timeout for request ${req._id}`);
                await workflowService.handleTimeout(req._id);
            }
        } catch (error) {
            console.error('Timeout Scheduler Error:', error);
        }
    });

    console.log('Workflow Scheduler started.');
};

module.exports = startScheduler;
