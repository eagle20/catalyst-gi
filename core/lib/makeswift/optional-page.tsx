import { Page as MakeswiftPage } from '@makeswift/runtime/next';

import { getPageSnapshot } from './client';

export async function OptionalMakeswiftSection({
  path,
  locale,
}: {
  path: string;
  locale: string;
}) {
  let snapshot;

  try {
    snapshot = await getPageSnapshot({ path, locale });
  } catch {
    return null;
  }

  if (snapshot == null) return null;

  return <MakeswiftPage snapshot={snapshot} />;
}
