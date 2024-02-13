import type { FastifyReply, FastifyRequest } from 'fastify';
import type * as WebSocket from 'ws';

import { getSafeJson } from '@mixan/common';
import type { IServiceCreateEventPayload } from '@mixan/db';
import { getEvents, getLiveVisitors } from '@mixan/db';
import { redis, redisPub, redisSub } from '@mixan/redis';

export function getLiveEventInfo(key: string) {
  return key.split(':').slice(2) as [string, string];
}

export async function test(
  req: FastifyRequest<{
    Params: {
      projectId: string;
    };
  }>,
  reply: FastifyReply
) {
  const [event] = await getEvents(
    `SELECT * FROM events WHERE project_id = '${req.params.projectId}' AND name = 'screen_view' LIMIT 1`
  );
  if (!event) {
    return reply.status(404).send('No event found');
  }
  redisPub.publish('event', JSON.stringify(event));
  redis.set(
    `live:event:${event.projectId}:${Math.random() * 1000}`,
    '',
    'EX',
    10
  );
  reply.status(202).send(event);
}

export function wsVisitors(
  connection: {
    socket: WebSocket;
  },
  req: FastifyRequest<{
    Params: {
      projectId: string;
    };
  }>
) {
  const { params } = req;

  redisSub.subscribe('event');
  redisSub.psubscribe('__key*:expired');

  const message = (channel: string, message: string) => {
    if (channel === 'event') {
      const event = getSafeJson<IServiceCreateEventPayload>(message);
      if (event?.projectId === params.projectId) {
        getLiveVisitors(params.projectId).then((count) => {
          connection.socket.send(String(count));
        });
      }
    }
  };
  const pmessage = (pattern: string, channel: string, message: string) => {
    const [projectId] = getLiveEventInfo(message);
    if (projectId && projectId === params.projectId) {
      getLiveVisitors(params.projectId).then((count) => {
        connection.socket.send(String(count));
      });
    }
  };

  redisSub.on('message', message);
  redisSub.on('pmessage', pmessage);

  connection.socket.on('close', () => {
    redisSub.unsubscribe('event');
    redisSub.punsubscribe('__key*:expired');
    redisSub.off('message', message);
    redisSub.off('pmessage', pmessage);
  });
}
