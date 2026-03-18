import prisma from '../prisma';

/**
 * Generate asset code following the pattern: NX-PC-YYMM-SEQ
 * e.g. NX-PC-2505-001
 */
export async function generateAssetCode(): Promise<string> {
  const now = new Date();
  const yy = String(now.getFullYear()).slice(2);
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const prefix = `NX-PC-${yy}${mm}`;

  const latest = await prisma.asset.findFirst({
    where: { assetCode: { startsWith: prefix } },
    orderBy: { assetCode: 'desc' },
  });

  let seq = 1;
  if (latest) {
    const parts = latest.assetCode.split('-');
    const lastSeq = parseInt(parts[parts.length - 1], 10);
    if (!isNaN(lastSeq)) seq = lastSeq + 1;
  }

  return `${prefix}-${String(seq).padStart(3, '0')}`;
}
