import amqp from 'amqp-connection-manager';
import { Channel, ConsumeMessage } from 'amqplib';
import {
  LeaveAppliedEvent,
  LeaveApprovedEvent,
  LeaveRejectedEvent,
} from '@leave-mgmt/shared';
import { config } from '../config';
import { logger } from '../lib/logger';

type LeaveEvent = LeaveAppliedEvent | LeaveApprovedEvent | LeaveRejectedEvent;

const connection = amqp.connect([config.rabbitmqUrl], {
  reconnectTimeInSeconds: 5,
});

export function startConsumer(): void {
  logger.info('Starting leave events consumer');

  connection.on('error', (err) => {
    logger.warn({ err }, 'RabbitMQ consumer connection error');
  });

  connection.createChannel({
    setup: async (channel: Channel) => {
      await channel.assertExchange('leave.events', 'topic', { durable: true });
      await channel.assertQueue('notification.queue', { durable: true });
      await channel.bindQueue('notification.queue', 'leave.events', 'leave.applied');
      await channel.bindQueue('notification.queue', 'leave.events', 'leave.approved');
      await channel.bindQueue('notification.queue', 'leave.events', 'leave.rejected');

      await channel.consume(
        'notification.queue',
        (msg: ConsumeMessage | null) => {
          if (!msg) {
            return;
          }

          let correlationId = 'unknown';

          try {
            const event = JSON.parse(msg.content.toString()) as LeaveEvent;
            correlationId = event.correlationId;

            switch (event.eventType) {
              case 'leave.applied':
                logger.info(
                  { correlationId: event.correlationId },
                  `NOTIFICATION | Leave Applied | Employee: ${event.leaveRequest.employeeId} | Type: ${event.leaveRequest.leaveType} | From: ${event.leaveRequest.startDate} To: ${event.leaveRequest.endDate} | Manager ${event.managerId} has been notified`,
                );
                break;

              case 'leave.approved':
                logger.info(
                  { correlationId: event.correlationId },
                  `NOTIFICATION | Leave Approved | Employee: ${event.employeeId} | Type: ${event.leaveRequest.leaveType} | From: ${event.leaveRequest.startDate} To: ${event.leaveRequest.endDate}`,
                );
                break;

              case 'leave.rejected':
                logger.info(
                  { correlationId: event.correlationId },
                  `NOTIFICATION | Leave Rejected | Employee: ${event.employeeId} | Reason: ${event.rejectionReason}`,
                );
                break;

              default:
                logger.warn(
                  { eventType: (event as LeaveEvent).eventType },
                  'Unknown event type received',
                );
            }

            channel.ack(msg);
          } catch (err) {
            logger.error({ err, correlationId }, 'Failed to process leave event');
            channel.nack(msg, false, false);
          }
        },
        { noAck: false },
      );
    },
  });
}
