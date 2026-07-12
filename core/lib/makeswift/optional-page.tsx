import { Page as MakeswiftPage } from '@makeswift/runtime/next';

import { getPageSnapshot } from './client';

export async function OptionalMakeswiftSection({
  path,
  locale,
}: {
  path: string;
  locale: string;
}) {
  const snapshot = await getPageSnapshot({ path, locale });

  if (snapshot == null) return null;

  return <MakeswiftPage snapshot={snapshot} />;
}
