const cron = require('node-cron');
const { EmergencyRequest, OrganInventory, AuditLog } = require('../models');
const workflowService = require('../services/workflowService');

const startScheduler = () => {
    // For testing: checks every 5 seconds and expands if unaccepted after 15 seconds
    cron.schedule('*/5 * * * * *', async () => {
        const now = new Date();
        const fifteenSecondsAgo = new Date(now.getTime() - 15 * 1000);

        try {
            const requestsToExpand = await EmergencyRequest.find({
                status: 'Generated',
                updatedAt: { $lt: fifteenSecondsAgo },
            });

            for (const req of requestsToExpand) {
                console.log(`Expanding radius for request ${req._id} (15s test mode)`);
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

    console.log('Workflow Scheduler started.');
};

module.exports = startScheduler;
