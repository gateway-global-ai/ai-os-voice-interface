/**
 * When Google returns SERVICE_DISABLED / "has not been used in project", the token is fine — the GCP project must enable the API.
 * @license SPDX-License-Identifier: Apache-2.0
 */

export function WorkspaceGoogleCloudApiDisabledHint({ message }: { message?: string | null }) {
  if (!message) return null;
  const isApiDisabled =
    /SERVICE_DISABLED|has not been used in project|it is disabled\. Enable it/i.test(message) &&
    (/googleapis\.com|Google API|People API|Drive API|Gmail API|Calendar API|Tasks API/i.test(message) ||
      /Enable it by visiting/i.test(message));
  if (!isApiDisabled) return null;

  const urlMatch = message.match(/https:\/\/console\.developers\.google\.com\/apis\/[^\s"'<>]+/);
  const url = urlMatch?.[0] ?? null;

  return (
    <div className="mt-3 text-xs text-amber-950/95 leading-relaxed border-t border-amber-200 pt-2 space-y-2">
      <p>
        <span className="font-semibold">Google Cloud API not enabled:</span> your sign-in token is likely fine. The{' '}
        <strong>Google Cloud project</strong> used when calling Google APIs (the project number appears in the error)
        must have the relevant API switched on (e.g. <strong>People API</strong> for Contacts).
      </p>
      <p>
        In <strong>Google Cloud Console → APIs &amp; Services → Library</strong>, enable that API, wait a few minutes
        for propagation, then retry.
      </p>
      {url ? (
        <p>
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-sky-800 underline underline-offset-2 hover:text-sky-950"
          >
            Open activation link from error
          </a>
        </p>
      ) : null}
    </div>
  );
}
