#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
CERT_DIR="$SCRIPT_DIR/certs"
HUB_ADDRESS="${1:-diona-hub}"

if ! command -v openssl >/dev/null 2>&1; then
    echo "openssl is required to generate DIONA testbed certificates." >&2
    exit 1
fi

if [[ ! "$HUB_ADDRESS" =~ ^[A-Za-z0-9._:-]+$ ]]; then
    echo "Provide a hostname or IP address without a scheme or port." >&2
    exit 1
fi

mkdir -p "$CERT_DIR"
if [[ -e "$CERT_DIR/ca.key" || -e "$CERT_DIR/ca.crt" || -e "$CERT_DIR/server.key" || -e "$CERT_DIR/server.crt" ]]; then
    echo "Certificate files already exist in $CERT_DIR; move them aside before generating a new CA." >&2
    exit 1
fi

umask 077
EXT_FILE="$(mktemp)"
CSR_FILE="$CERT_DIR/server.csr"
SERIAL_FILE="$CERT_DIR/ca.srl"
trap 'rm -f "$EXT_FILE" "$CSR_FILE" "$SERIAL_FILE"' EXIT

if [[ "$HUB_ADDRESS" == "diona-hub" ]]; then
    HUB_SAN=""
elif [[ "$HUB_ADDRESS" =~ : || "$HUB_ADDRESS" =~ ^[0-9.]+$ ]]; then
    HUB_SAN="IP.2 = $HUB_ADDRESS"
else
    HUB_SAN="DNS.2 = $HUB_ADDRESS"
fi

cat > "$EXT_FILE" <<EOF
[server_cert]
basicConstraints = critical,CA:FALSE
keyUsage = critical,digitalSignature,keyEncipherment
extendedKeyUsage = serverAuth
subjectAltName = @alt_names

[alt_names]
DNS.1 = diona-hub
IP.1 = 127.0.0.1
$HUB_SAN
EOF

openssl genrsa -out "$CERT_DIR/ca.key" 4096

# Prevent Git Bash from converting OpenSSL's /CN= subjects into Windows paths.
export MSYS2_ARG_CONV_EXCL="${MSYS2_ARG_CONV_EXCL:+$MSYS2_ARG_CONV_EXCL;}/CN="

openssl req -x509 -new -key "$CERT_DIR/ca.key" -sha256 -days 365 \
    -out "$CERT_DIR/ca.crt" \
    -subj "/CN=DIONA Testbed CA" \
    -addext "basicConstraints=critical,CA:TRUE" \
    -addext "keyUsage=critical,keyCertSign,cRLSign"

openssl genrsa -out "$CERT_DIR/server.key" 2048
openssl req -new -key "$CERT_DIR/server.key" -out "$CSR_FILE" \
    -subj "/CN=diona-hub"
openssl x509 -req -in "$CSR_FILE" \
    -CA "$CERT_DIR/ca.crt" -CAkey "$CERT_DIR/ca.key" -CAcreateserial \
    -out "$CERT_DIR/server.crt" -days 365 -sha256 \
    -extfile "$EXT_FILE" -extensions server_cert

chmod 600 "$CERT_DIR/ca.key" "$CERT_DIR/server.key"
chmod 644 "$CERT_DIR/ca.crt" "$CERT_DIR/server.crt"
echo "Generated 365-day DIONA CA and server certificates in $CERT_DIR"
echo "Server certificate subject: CN=diona-hub; SAN includes $HUB_ADDRESS"
echo "Keep ca.key and server.key private. Distribute only ca.crt to nodes."
