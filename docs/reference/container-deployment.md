# Container deployment

The repository Dockerfile packages one standalone primary instance for a trusted
operator. It serves the built SPA, API and WebSockets on container port `3456`.
Terminate public TLS at the deployment proxy and expose the application through
HTTPS. Keep the container port private to the deployment network.

This is the primary application, not a cloud companion or a replica. Leave
`WALNUT_CLOUD_MODE` and `WALNUT_HOST_SERVER` unset. The public instance endpoint
must report `mode: "LIVE"`.

## Image contract

The image uses Node.js 22 on Debian Bookworm, Bun for the precompiled daemon and
sidecars, and the Claude Code CLI. Exact versions are Docker build arguments:
`NODE_VERSION`, `BUN_VERSION` and `CLAUDE_CODE_VERSION`. The CLI executable and
the Claude Agent SDK are independently versioned: a matching-looking version
number does not establish model support. Check the CLI floor of the chosen model
in [Claude model configuration](claude-model-configuration.md) before changing
the CLI pin. Validate the selected image and package tags before building.

`npm ci` runs with the complete source present so its postinstall applies the SDK
patch and installs the frontend from its lockfile. `npm run build` builds the
plugin workspaces, daemon binaries, built-in plugins and plugin store. Vite then
builds the SPA into `dist/web/static`. Development dependencies are pruned after
building; optional dependencies, including native search support, remain enabled.
An initial semantic search may still need to download its model and needs suitable
memory and outbound connectivity.

The runtime is the existing `node` user, UID/GID `1000:1000`. It includes Git,
SSH, ripgrep, Node.js, Bun, Python and the native build toolchain for coding
sessions. Application files in `/app` are owned by root. Writable repositories
belong under `/home/node/workspaces`; the application does not need a host source
mount, privileged mode, additional Linux capabilities or a Docker socket.

`WALNUT_NO_AUTO_UPDATE=1` and `WALNUT_NO_UPDATE_CHECK=1` prevent the upstream
npm self-update path. Upgrade the image deliberately from a reviewed commit.
Build only a clean source archive and keep local credentials outside its context.
Do not pass provider credentials through build arguments or copy a developer's
home into the image.

## Persistence and single-writer operation

Mount one named persistent volume at **`/home/node`**, not only at
`/home/node/.open-walnut`. This retains application data, paired-device records,
Claude configuration and credentials, checked-out repositories, tool caches and
the local daemon state. The image sets:

| Variable | Value |
| --- | --- |
| `HOME` | `/home/node` |
| `OPEN_WALNUT_HOME` | `/home/node/.open-walnut` |
| `WALNUT_DAEMON_DIR` | `/home/node/.open-walnut/daemon` |

The volume must be writable by UID/GID `1000:1000`. A new Docker named volume
inherits the initialized home directory from the image. For a pre-existing volume
or bind mount, prepare and verify ownership before starting the service.

Run exactly **one replica**. Deploy and roll back with **stop-first** ordering,
so two containers never write the same home concurrently. Replacement briefly
interrupts the service and ends running child processes. Persisted data and
transcripts survive; a volume does not preserve a live shell or guarantee that a
provider turn resumes without user action. Configure the orchestrator to restart
failed containers and give graceful shutdown at least ten seconds.

## CapRover

The root `captain-definition` references the repository Dockerfile using
[CapRover's definition format](https://caprover.com/docs/captain-definition-file.html).
Before deploying a committed source archive, configure:

1. A persistent app with one instance, pinned to the node holding its volume.
2. One persistent directory at `/home/node`, backed by a dedicated named volume.
3. Container HTTP port `3456`, with no host port mapping.
4. The intended public domain, a valid certificate and enforced HTTPS.
5. A service update override that retains single-writer ordering:

```yaml
Mode:
  Replicated:
    Replicas: 1
UpdateConfig:
  Parallelism: 1
  Order: stop-first
RollbackConfig:
  Parallelism: 1
  Order: stop-first
TaskTemplate:
  ContainerSpec:
    StopGracePeriod: 10000000000
```

The grace period uses Docker Engine API nanoseconds. Check the resulting service
spec after applying the override. CapRover's
[persistent app](https://caprover.com/docs/persistent-apps.html),
[app configuration](https://caprover.com/docs/app-configuration.html) and
[service override](https://caprover.com/docs/service-update-override.html)
references describe the platform settings; the Dockerfile alone does not create
the named volume, domain, certificate or deployment policy.

Native API requests use `Authorization: Bearer`. A transparent HTTP Basic login at
the proxy consumes that same header and prevents the paired browser from reaching
the API. Preserve the native pairing flow; any additional access gateway must be
verified with authenticated API requests and WebSocket connections. Review the
dependency audit before promoting a personal test instance to broader use.

Preserve the public `Host`, `X-Forwarded-For`, `X-Forwarded-Proto`, authorization
header and WebSocket upgrades through every proxy. The outer trusted proxy must
set the forwarded client address rather than accept an arbitrary client value.
Do not rewrite public traffic as direct loopback requests: the application's
local-trust classification depends on this distinction. Treat other workloads
on the deployment network as a trust boundary and restrict direct backend access.

## First browser and provider setup

Create a browser sign-in code from an authorized administrative shell **inside
the running container**, as its normal user. This request intentionally has no
forwarded headers and never crosses the public proxy:

```bash
node --input-type=module -e 'const r=await fetch("http://127.0.0.1:3456/api/devices/browser-code",{method:"POST",signal:AbortSignal.timeout(5000)});if(!r.ok)throw new Error(`Pairing failed: ${r.status}`);console.log(JSON.stringify(await r.json()))'
```

Open `https://<your-domain>/#pair=<code>` in the intended browser. Codes contain
eight alphanumeric characters, displayed as `ABCD-EFGH`, are single-use, expire
after ten minutes and are held in memory;
a server restart invalidates an unused code. The browser removes the fragment
and exchanges the code at `POST /api/v1/browser-pair`. It stores the returned
device token under `walnut.deviceToken` in that browser's local storage. Generate
a separate code for each browser; anyone holding a usable code can claim it.

Keep codes and tokens out of shared logs, tickets and build output. WebSocket
authentication may put a device token in a query string: suppress or redact query
strings in proxy access logs. Do not publish a reusable bearer token in a URL.
Pairing records live in the persistent home and can be revoked through the native
device-management flow. Revocation refuses subsequent authenticated requests and
new WebSocket connections. Immediate termination of an already-open browser
WebSocket is not established by this packaging.

Browser access and model-provider access are separate. Configure the selected
provider using the application and Claude Code's supported authentication path,
as described in the main [README](../../README.md). Keep its credentials in the
persistent home or inject them only at runtime through the deployment's protected
secret mechanism. Installing the CLI provides its executable, not a subscription,
provider account or working inference. Grant SSH keys and repository permissions
only for the repositories the operator intends the agent to control.

## Verification and recovery

The Docker healthcheck requests the public `GET /api/v1/instance`, requires a
non-empty instance ID and `mode: "LIVE"`, and makes no model request. This proves
an HTTP route answers; it does not prove browser pairing, the daemon, a coding
session, semantic search, provider credentials or a real AI response.

After deployment, verify HTTPS and the SPA, refusal of unpaired remote API and
WebSocket access, native browser pairing, and an authenticated board request.
Then check CLI detection and a bounded real-provider turn with the intended
model. Report paid/provider checks separately from image build and HTTP checks.
Confirm an application record and a file under `/home/node/workspaces` remain
after a controlled container replacement before relying on persistence.

The operator owns provider failures, access revocation, backups and recovery.
When pairing is lost, mint a new short-lived code through the administrative
shell; do not weaken proxy headers or publish the backend port. A failed provider
login requires correcting that provider's credentials, not a new browser token.
If the home is unwritable or storage is unavailable, stop and restore its
ownership or availability before restarting against the same data.

Back up the **entire home volume** independently of the container image. Quiesce
the sole writer before a file-level backup, encrypt and restrict backups because
they include credentials, and test restoration. Before an upgrade, record the
image digest and take a restorable snapshot. An image rollback does not reverse
application data migrations; restore the matching snapshot if the older image
cannot read the newer data. To move nodes, stop the old writer, copy the complete
volume preserving UID/GID `1000:1000`, restore secret access, and start one writer
on the destination. Verify records and authentication before changing traffic.

## Governance limits

This deployment supports a personal trusted operator and that operator's paired
devices. It does not supply corporate SSO, MFA enforcement, role-based access
control, separate tenant data or multi-user authorization. Pairing is possession
of a bearer credential with broad access to the operator's application and coding
tools. Native logs and device attribution do not establish a tamper-resistant
enterprise audit trail.

Without corporate infrastructure, the operator administers the container, device
pairing, provider accounts and backup recovery directly. In a corporate setting,
place the deployment behind the organization's controlled network/access layer
and assign an accountable administrator for devices, repository credentials and
recovery. An outer identity proxy does not add application roles or tenant
isolation. A requirement for per-person authorization, centralized provisioning,
immediate session revocation or enforceable audit retention needs a separately
designed and verified access architecture before use with that requirement. Do
not present those controls as implemented by this image.
