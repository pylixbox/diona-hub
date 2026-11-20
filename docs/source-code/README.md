# Appendix A — Relevant Source Code

This index maps the source code cited in the capstone to the versioned DIONA
repository. The Pi-specific Snort rules and running JSON-output command are
included here; the remaining entries link to their source files.

## A.1 Custom Snort 3 detection rules

Source on the observer node: `/home/diona4/diona_test.rules`

```snort
alert icmp any any -> any any (msg:"DIONA ICMP test"; sid:1000001; rev:1;)
alert tcp any any -> 192.168.62.49 any (msg:"DIONA lab SYN burst"; flags:S; flow:stateless; detection_filter:track by_src, count 10, seconds 10; sid:1000002; rev:1;)
alert udp any any -> 192.168.62.49 any (msg:"DIONA lab UDP burst"; detection_filter:track by_src, count 10, seconds 10; sid:1000003; rev:1;)
alert tcp 192.168.62.49 21 -> any any (msg:"DIONA lab FTP auth failure burst"; flow:to_client,established; content:"530"; detection_filter:track by_dst, count 5, seconds 60; sid:1000004; rev:1;)
```

The rules use Snort's `alert` action; matching traffic is logged, not dropped.
The SHA-256 observed on the Pi was
`48dc567441bdc2cab1fe5bf6e1d8fd01089f27a2a5645d5ecb05ab7591f70771`.
Validation reported 223 rules loaded and zero warnings.

## A.2 Snort 3 JSON alert output

JSON logging is enabled in the running Snort command, rather than in the
`snort.lua` excerpt. The observed command was:

```sh
sudo /usr/local/bin/snort -c /usr/local/etc/snort/snort.lua -R /home/diona4/diona_test.rules -i wlan0 -A alert_json -l /var/log/snort --lua alert_json = { file = true, fields = "timestamp src_addr dst_addr msg priority rule action proto" }
```

## A.3 Node alert forwarder

[diona_shipper.py](../../diona-hub/diona_shipper.py)

## A.4 Hub alert ingestion endpoint

[app/routes/alerts.py](../../diona-hub/app/routes/alerts.py)

## A.5 Node Bearer-token authentication

[app/routes/node_auth.py](../../diona-hub/app/routes/node_auth.py)

## A.6 Database models

[app/models.py](../../diona-hub/app/models.py)

## A.7 Telegram notification service

[app/services/telegram.py](../../diona-hub/app/services/telegram.py)

## A.8 TLS certificate generation

[generate_certs.sh](../../diona-hub/generate_certs.sh)

## A.9 Database provisioning and reset

- [setup_db.sh](../../diona-hub/setup_db.sh)
- [reset_db.py](../../diona-hub/reset_db.py)
