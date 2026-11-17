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

Set `TLS_ENABLED=true` in the hub environment (or `.env`) and start the hub
with `python run.py`. It will serve HTTPS on port 5001. Without that setting,
the development server continues to use HTTP on port 5000.

## Configure Raspberry Pi nodes

Securely copy **only** `certs/ca.crt` to each Pi, for example:

```sh
scp certs/ca.crt pi@<node>:/home/pi/diona/ca.crt
```

Do not copy `ca.key` or `server.key` to a node. Set the Pi's `config.json` to
use the HTTPS URL and the CA certificate:

```json
{
  "hub_ip": "https://192.168.1.10:5001",
  "node_name": "diona-pi-01",
  "api_key": "<same value as the hub's NODE_API_KEY>",
  "ca_cert": "/home/pi/diona/ca.crt"
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
