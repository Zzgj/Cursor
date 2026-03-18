import prisma from '../prisma';

export async function logOperation(params: {
  operatorId: number;
  action: string;
  targetType: string;
  targetId?: number;
  detail?: any;
  ipAddress?: string;
}) {
  await prisma.operationLog.create({
    data: {
      operatorId: params.operatorId,
      action: params.action,
      targetType: params.targetType,
      targetId: params.targetId,
      detail: params.detail ? JSON.stringify(params.detail) : null,
      ipAddress: params.ipAddress,
    },
  });
}
