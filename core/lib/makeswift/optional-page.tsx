import { getPageSnapshot } from './client';
import { MakeswiftPageShim } from './makeswift-page-shim';
import { MAKESWIFT_METADATA } from './page';

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

  return <MakeswiftPageShim metadata={MAKESWIFT_METADATA} snapshot={snapshot} />;
}
