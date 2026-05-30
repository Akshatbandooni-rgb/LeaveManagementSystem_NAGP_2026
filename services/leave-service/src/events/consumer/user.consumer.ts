import amqp from 'amqp-connection-manager';
import { Channel, ConsumeMessage } from 'amqplib';
import { UserCreatedEvent } from '@leave-mgmt/shared';
import { config } from '../../config';
import { logger } from '../../lib/logger';
import * as balanceRepo from '../../repositories/balance.repository';

const connection = amqp.connect([config.rabbitmqUrl], {
  reconnectTimeInSeconds: 5,
});

export function startConsumer(): void {
  logger.info('Starting user.created consumer');

  connection.on('error', (err) => {
    logger.warn({ err }, 'RabbitMQ consumer connection error');
  });

  connection.createChannel({
    setup: async (channel: Channel) => {
      await channel.assertExchange('user.events', 'topic', { durable: true });
      await channel.assertQueue('leave-service.user.created', { durable: true });
      await channel.bindQueue('leave-service.user.created', 'user.events', 'user.created');

      await channel.consume(
        'leave-service.user.created',
        (msg: ConsumeMessage | null) => {
          if (!msg) {
            return;
          }

          let correlationId = 'unknown';

          try {
            const event = JSON.parse(msg.content.toString()) as UserCreatedEvent;
            correlationId = event.correlationId;

            balanceRepo.initializeBalance(event.userId);

            logger.info(
              { correlationId },
              `Balance initialized for user: ${event.userId}`,
            );

            channel.ack(msg);
          } catch (err) {
            logger.error({ err, correlationId }, 'Failed to process user.created event');
            channel.nack(msg, false, false);
          }
        },
        { noAck: false },
      );
    },
  });
}
