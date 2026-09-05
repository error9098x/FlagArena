"""Non-mutating checks for installer validation and generated configuration."""
import json
import stat
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch
import install


class InstallerTests(unittest.TestCase):
    def test_supported_operating_systems(self):
        self.assertEqual(install.os_release('ID=debian\nVERSION_ID="12"\n'), ('debian', '12'))
        self.assertEqual(install.os_release('ID=ubuntu\nVERSION_ID="22.04"\n'), ('ubuntu', '22.04'))
        self.assertEqual(install.os_release('ID=ubuntu\nVERSION_ID="24.04"\n'), ('ubuntu', '24.04'))

    def test_unsupported_operating_system_reports_detected_version(self):
        with self.assertRaisesRegex(RuntimeError, 'debian 11'):
            install.os_release('ID=debian\nVERSION_ID="11"\n')

    def test_domain(self):
        self.assertEqual(install.domain_name('Arena.Example.com'), 'arena.example.com')
        for value in ('https://example.com', '127.0.0.1', 'x;rm.example.com', 'example.com/a', 'example..com', '-bad.example.com'):
            with self.subTest(value=value), self.assertRaises(RuntimeError):
                install.domain_name(value)

    def test_ports(self):
        self.assertEqual(install.port('8080'), 8080)
        for value in ('80', '443', '5432', '65536', 'abc'):
            with self.subTest(value=value), self.assertRaises(RuntimeError):
                install.port(value)

    def test_secrets_validation(self):
        self.assertEqual(install.password('a-good-long-password'), 'a-good-long-password')
        for value in ('short', 'x' * 73, 'some-long\npassword'):
            with self.assertRaises(RuntimeError):
                install.password(value)

    def test_environment_quoting(self):
        self.assertEqual(install.env_text({'PORT': 8080}), 'PORT="8080"\n')
        with self.assertRaises(RuntimeError):
            install.env_text({'SECRET': 'bad\nOTHER=value'})
        self.assertIn('\\"', install.env_text({'SENDER': 'Name "quoted"'}))

    def test_secret_file_permissions(self):
        with tempfile.TemporaryDirectory() as directory:
            target = Path(directory) / 'private.env'
            install.write(target, 'SECRET="test"\n', 0o600)
            self.assertEqual(stat.S_IMODE(target.stat().st_mode), 0o600)

    def test_nginx(self):
        config = {'domain': 'arena.example.com', 'api_port': 8080}
        http = install.nginx_config(config, False)
        self.assertIn('/.well-known/acme-challenge/', http)
        self.assertNotIn('ssl_certificate', http)
        https = install.nginx_config(config, True)
        self.assertIn('127.0.0.1:8080', https)
        self.assertIn('listen 443 ssl;', https)
        self.assertIn('proxy_set_header X-Forwarded-For $remote_addr;', https)
        self.assertIn('return 301 https://arena.example.com$request_uri;', https)

    def test_dns_rejects_stale_record(self):
        with patch.object(install.socket, 'getaddrinfo', return_value=[(2, 1, 6, '', ('192.0.2.2', 80))]):
            with self.assertRaises(RuntimeError):
                install.validate_dns({'domain': 'arena.example.com', 'ip': '192.0.2.1'})

    def test_dns_matches(self):
        with patch.object(install.socket, 'getaddrinfo', return_value=[(2, 1, 6, '', ('192.0.2.1', 80))]):
            install.validate_dns({'domain': 'arena.example.com', 'ip': '192.0.2.1'})

    def test_resend_uses_test_sink(self):
        config = {'sender_name': 'Arena', 'sender_email': 'sender@example.com', 'resend_key': 're_test'}
        with patch.object(install, 'fetch', return_value=b'{"id":"example"}') as fetch:
            install.validate_mail(config)
            body = json.loads(fetch.call_args.kwargs['data'])
            self.assertEqual(body['to'], ['delivered@resend.dev'])
            self.assertEqual(body['from'], 'Arena <sender@example.com>')

    def test_resend_requires_acceptance(self):
        with patch.object(install, 'fetch', return_value=b'{}'):
            with self.assertRaises(RuntimeError):
                install.validate_mail({'sender_name': 'Arena', 'sender_email': 'sender@example.com', 'resend_key': 're_test'})

    def test_failed_command_stops(self):
        with patch.object(install.subprocess, 'run') as run:
            run.return_value.returncode = 1
            with self.assertRaises(RuntimeError):
                install.run(['example-command'])


if __name__ == '__main__':
    unittest.main()
