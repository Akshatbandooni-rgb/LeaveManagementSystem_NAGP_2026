import amqp from 'amqp-connection-manager';
import { ConfirmChannel } from 'amqplib';
import {
  LeaveAppliedEvent,
  LeaveApprovedEvent,
  LeaveRejectedEvent,
} from '@leave-mgmt/shared';
import { config } from '../config';
import { logger } from './logger';

const connection = amqp.connect([config.rabbitmqUrl], {
  reconnectTimeInSeconds: 5,
});

const channelWrapper = connection.createChannel({
  setup: async (channel: ConfirmChannel) => {
    await channel.assertExchange('leave.events', 'topic', { durable: true });
  },
});

export function connect(): void {
  logger.info('Connecting to RabbitMQ');

  connection.on('connect', () => {
    logger.info('Connected to RabbitMQ');
  });

  connection.on('disconnect', (params) => {
    logger.warn({ err: params.err }, 'Disconnected from RabbitMQ');
  });

  connection.on('connectFailed', (params) => {
    logger.warn({ err: params.err }, 'Failed to connect to RabbitMQ');
  });

  connection.on('error', (err) => {
    logger.warn({ err }, 'RabbitMQ connection error');
  });
}

export function publishLeaveApplied(event: LeaveAppliedEvent): void {
  try {
    channelWrapper.publish(
      'leave.events',
      'leave.applied',
      Buffer.from(JSON.stringify(event)),
      { persistent: true, contentType: 'application/json' },
    );
  } catch (err) {
    logger.error({ err }, 'Failed to publish leave.applied event');
  }
}

export function publishLeaveApproved(event: LeaveApprovedEvent): void {
  try {
    channelWrapper.publish(
      'leave.events',
      'leave.approved',
      Buffer.from(JSON.stringify(event)),
      { persistent: true, contentType: 'application/json' },
    );
  } catch (err) {
    logger.error({ err }, 'Failed to publish leave.approved event');
  }
}

export function publishLeaveRejected(event: LeaveRejectedEvent): void {
  try {
    channelWrapper.publish(
      'leave.events',
      'leave.rejected',
      Buffer.from(JSON.stringify(event)),
      { persistent: true, contentType: 'application/json' },
    );
  } catch (err) {
    logger.error({ err }, 'Failed to publish leave.rejected event');
  }
}
