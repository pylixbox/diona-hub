import unittest
from datetime import datetime

from diona_shipper import build_alert_payload


class BuildAlertPayloadTests(unittest.TestCase):
    def test_builds_payload_from_snort3_json(self):
        payload = build_alert_payload(
            {
                "timestamp": "11/17-20:28:10.123456",
                "src_addr": "192.168.15.49",
                "dst_addr": "192.168.15.183",
                "msg": "DIONA local test alert",
                "priority": 1,
            },
            "diona-pi4",
        )

        self.assertEqual(payload["source_ip"], "192.168.15.49")
        self.assertEqual(payload["target_ip"], "192.168.15.183")
        self.assertEqual(payload["attack_type"], "DIONA local test alert")
        self.assertEqual(payload["severity_level"], "High")
        self.assertEqual(
            datetime.fromisoformat(payload["timestamp"]).year,
            datetime.now().year,
        )

    def test_preserves_legacy_snort_fields(self):
        payload = build_alert_payload(
            {
                "source_ip": "192.168.15.10",
                "target_ip": "192.168.15.20",
                "signature": "Legacy alert",
                "severity": "2",
                "timestamp": "2026-11-17T20:28:10Z",
            },
            "diona-pi3",
        )

        self.assertEqual(payload["source_ip"], "192.168.15.10")
        self.assertEqual(payload["target_ip"], "192.168.15.20")
        self.assertEqual(payload["attack_type"], "Legacy alert")
        self.assertEqual(payload["severity_level"], "Medium")
        self.assertEqual(payload["timestamp"], "2026-11-17T20:28:10+00:00")

    def test_omits_unsupported_timestamp(self):
        payload = build_alert_payload(
            {
                "src_addr": "192.168.15.49",
                "msg": "DIONA local test alert",
                "timestamp": "not-a-timestamp",
            },
            "diona-pi4",
        )

        self.assertNotIn("timestamp", payload)


if __name__ == "__main__":
    unittest.main()
