# DIONA testbed TLS setup

These self-signed certificates are for a trusted local testbed, not a public
production deployment.

## Generate certificates

From the `diona-hub` directory, pass the hub's IP address or hostname so the
server certificate includes it in its Subject Alternative Name (SAN):

```sh
bash generate_certs.sh 192.168.1.10
```

The script creates `certs/ca.crt`, `certs/ca.key`, `certs/server.crt`, and
`certs/server.key`. Both certificates are valid for 365 days. The server
certificate has `CN=diona-hub`. Keep both private keys secret; `certs/` is
git-ignored.

The hub defaults to `DIONA_HOST=127.0.0.1` with debug mode disabled, so it is
reachable only from the Windows PC. For Pi access, set `DIONA_HOST` to the
hub's testbed IP address and `TLS_ENABLED=true` in the hub environment (or
`.env`), then start the hub with `python run.py`. It will serve HTTPS on port
5001. Binding to a non-loopback address without TLS is refused.

## Windows firewall

On the Windows hub, create a narrow inbound rule from an elevated PowerShell.
Replace the example address strings with the current hub Wi-Fi IP and Pi IPs.
Include the hub IP as a remote address for the local dashboard proxy:

```powershell
$HubIP = '192.168.15.177'
$PiIPs = @('192.168.15.49', '192.168.15.208')
New-NetFirewallRule -DisplayName 'DIONA Hub HTTPS from Pi Nodes' `
  -Direction Inbound -Action Allow -Protocol TCP -LocalPort 5001 `
  -LocalAddress $HubIP -RemoteAddress ($PiIPs + $HubIP) -Profile Public
```

The rule is restricted to the hub address, the node addresses, and TCP port
5001. Update it if the hotspot assigns different addresses.

## Local dashboard

The Vite dev server listens on `127.0.0.1` and proxies `/api` to the HTTPS hub,
validating it with the local CA. In the dashboard's ignored `.env.local`, set:

```dotenv
VITE_API_BASE_URL=http://127.0.0.1:5173
DIONA_HUB_URL=https://<hub-wifi-ip>:5001
DIONA_CA_CERT_PATH=..\diona-hub\certs\ca.crt
```

## Configure Raspberry Pi nodes

Copy the shipper script and **only** the CA certificate to each Pi, for example:

```sh
scp diona_shipper.py certs/ca.crt pi@<node>:/home/pi/
```

Do not copy `ca.key` or `server.key` to a node. Set the Pi's `config.json` to
use the HTTPS URL and the CA certificate. Keep `config.json` beside
`diona_shipper.py`; `ca_cert` can be an absolute path or a path relative to
that directory:

```json
{
  "hub_ip": "https://192.168.1.10:5001",
  "node_name": "diona-pi-01",
  "api_key": "<same value as the hub's NODE_API_KEY>",
  "ca_cert": "/home/pi/ca.crt"
}
```

The address in `hub_ip` must match the host or IP SAN included when generating
the server certificate. The shipper verifies the hub using `ca_cert`. If
`ca_cert` is omitted, it logs a warning and disables certificate verification;
configure the CA file for normal testbed use.

## Verify the TLS connection

From a machine with OpenSSL and the CA certificate:

```sh
openssl s_client -connect 192.168.1.10:5001 \
  -CAfile certs/ca.crt -verify_return_error -verify_ip 192.168.1.10
```

For a DNS hostname, use `-verify_hostname <hostname>` instead of
`-verify_ip <address>`. A successful verification ends with
`Verify return code: 0 (ok)`.

## Capture and inspect traffic

Capture traffic to the TLS port on the interface connected to the testbed:

```sh
sudo tcpdump -i eth0 -nn -s0 -w /tmp/diona-tls.pcap \
  'host 192.168.1.10 and tcp port 5001'
```

Generate a heartbeat or alert, stop the capture, and inspect the capture in
Wireshark. The connection should show a TLS handshake and encrypted TLS
Application Data records, not readable alert JSON or the HTTP Authorization
header. TLS still exposes connection metadata such as endpoint IPs and packet
sizes.
