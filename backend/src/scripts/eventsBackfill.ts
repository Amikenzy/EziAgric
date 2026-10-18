import { eventListenerConfig } from '../config/eventListener.config';
import { prisma } from '../lib/db';
import { EventListenerService } from '../services/eventListener.service';

interface BackfillArgs {
  from: number;
  to: number;
}

function parseArgs(argv: string[]): BackfillArgs {
  const args: Record<string, string> = {};
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (token.startsWith('--')) {
      const key = token.slice(2);
      const value = argv[i + 1];
      if (value && !value.startsWith('--')) {
        args[key] = value;
        i += 1;
      } else {
        args[key] = 'true';
      }
    }
  }

  const from = Number(args.from);
  const to = Number(args.to);

  if (!Number.isInteger(from) || from < 0) {
    throw new Error('Missing or invalid --from <ledger> argument');
  }
  if (!Number.isInteger(to) || to < from) {
    throw new Error('Missing or invalid --to <ledger> argument (must be >= --from)');
  }

  return { from, to };
}

async function main(): Promise<void> {
  const { from, to } = parseArgs(process.argv.slice(2));
  const service = new EventListenerService(prisma, eventListenerConfig);

  console.log(`[events:backfill] starting range ${from}..${to}`);

  let processed = 0;
  let skipped = 0;

  try {
    for (let ledger = from; ledger <= to; ledger += 1) {
      const alreadyProcessed = await service.isLedgerProcessed(ledger);
      if (alreadyProcessed) {
        skipped += 1;
        console.log(`[events:backfill] ledger ${ledger} already processed, skipping`);
        continue;
      }

      await service.processLedger(ledger);
      processed += 1;
      console.log(
        `[events:backfill] ledger ${ledger} processed (${processed} done, ${skipped} skipped, ${to - ledger} remaining)`,
      );
    }

    console.log(
      `[events:backfill] complete: ${processed} processed, ${skipped} skipped for range ${from}..${to}`,
    );
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error('[events:backfill] failed:', error);
  process.exitCode = 1;
});
