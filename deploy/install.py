#!/usr/bin/env python3
"""Interactive populated-demo installer for a dedicated Debian or Ubuntu GCP VM."""

import argparse
import getpass
import hashlib
import ipaddress
import json
import os
from pathlib import Path
import platform
import re
import secrets
import shutil
import socket
import subprocess
import sys
import tempfile
import time
import urllib.error
import urllib.request

ROOT = Path(__file__).resolve().parent.parent
APP = Path('/opt/flagarena')
STATE = Path('/var/lib/flagarena')
ENV_FILE = Path('/etc/flagarena.env')
STAGE = 'preflight'
SUPPORTED_OS = {
    'debian': {'12', '13'},
    'ubuntu': {'22.04', '24.04'},
}


def require(condition, message):
    if not condition:
        raise RuntimeError(message)


def one_line(value):
    require(not any(ord(c) < 32 or ord(c) == 127 for c in value),
            'Values must not contain newlines or control characters.')
    return value


def os_release(content):
    values = {}
    for line in content.splitlines():
        if '=' not in line or line.startswith('#'):
            continue
        key, value = line.split('=', 1)
        values[key] = value.strip().strip('"').strip("'")
    name = values.get('ID', '').lower()
    version = values.get('VERSION_ID', '')
    require(version in SUPPORTED_OS.get(name, set()),
            f"Unsupported operating system: {name or 'unknown'} {version or 'unknown'}. Use Debian 12/13 or Ubuntu 22.04/24.04 LTS.")
    return name, version


def domain_name(value):
    value = one_line(value.strip().lower())
    require(len(value) <= 253 and '.' in value and all(
        re.fullmatch(r'[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?', part)
        for part in value.split('.')), 'Enter a DNS hostname, without https://, a path, or a port.')
    try:
        ipaddress.ip_address(value)
    except ValueError:
        return value
    raise RuntimeError('Use a domain name for the HTTPS certificate, not an IP address.')


def email(value):
    value = one_line(value.strip().lower())
    require(len(value) <= 254 and re.fullmatch(r"[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-z0-9.-]+", value),
            'Enter a valid email address.')
    domain_name(value.rsplit('@', 1)[1])
    local = value.rsplit('@', 1)[0]
    require(not local.startswith('.') and not local.endswith('.') and '..' not in local,
            'Email local parts must not start/end with a dot or contain consecutive dots.')
    return value


def port(value):
    require(value.isdecimal() and 1024 <= int(value) <= 65535 and int(value) != 5432,
            'Choose an unused API port from 1024 to 65535, excluding PostgreSQL port 5432.')
    return int(value)


def password(value):
    one_line(value)
    require(12 <= len(value) and len(value.encode()) <= 72,
            'Use at least 12 characters and at most 72 UTF-8 bytes for the administrator password.')
    return value


def ask(label, default='', validate=one_line, secret=False):
    while True:
        prompt = label + (f' [{default}]' if default else '') + ': '
        value = (getpass.getpass(prompt) if secret else input(prompt)) or default
        try:
            require(bool(value), 'This value is required.')
            return validate(value)
        except (RuntimeError, ValueError) as error:
            print(error)


def fetch(url, data=None, headers=None, timeout=25):
    # Resend sits behind a CDN that rejects the default Python-urllib agent.
    headers = dict(headers or {})
    headers.setdefault('User-Agent', 'FlagArena-Installer/1.0 (+https://github.com/error9098x/FlagArena)')
    request = urllib.request.Request(url, data=data, headers=headers)
    with urllib.request.urlopen(request, timeout=timeout) as response:
        return response.read()


def validate_mail(config):
    # Resend's sink tests actual sending permission and the exact From address.
    # Listing domains alone would incorrectly reject sending-only API keys.
    body = json.dumps({
        'from': f"{config['sender_name']} <{config['sender_email']}>",
        'to': ['delivered@resend.dev'],
        'subject': 'FlagArena deployment configuration check',
        'text': 'Sender validation for a FlagArena installation.',
    }).encode()
    try:
        response = json.loads(fetch('https://api.resend.com/emails', data=body, headers={
            'Authorization': 'Bearer ' + config['resend_key'],
            'Content-Type': 'application/json',
        }))
        require(bool(response.get('id')), 'Resend did not accept the test message.')
    except urllib.error.HTTPError as error:
        detail = error.read().decode('utf-8', 'replace')[:200].strip()
        raise RuntimeError(f'Resend rejected the configuration (HTTP {error.code}): {detail}. Check the API key, sending permission, verified sender domain, and account limits.') from None
    print('Resend accepted the test message for the configured sender.')


def validate_dns(config):
    records = {item[4][0] for item in socket.getaddrinfo(config['domain'], 80, type=socket.SOCK_STREAM)}
    require(records == {config['ip']},
            'DNS must resolve only to the specified VM IPv4 address for this installer. Correct stale A/AAAA records or disable CDN proxying, then retry.')


def collect():
    print('FlagArena · populated demo installation on Debian or Ubuntu\n')
    print('All settings are collected before packages, databases, or services are changed.\nCtrl+C cancels. Passwords and the API key are hidden.\n')
    config = {}
    config['domain'] = ask('Public hostname (for example arena.example.com)', validate=domain_name)
    config['ip'] = ask('This VM\'s reserved external IPv4 address', validate=lambda v: str(ipaddress.IPv4Address(v)))
    config['api_port'] = ask('Private API port (do not open this in the cloud firewall)', '8080', port)
    config['admin_name'] = ask('Initial administrator display name', 'Admin')
    require(3 <= len(config['admin_name']) <= 32, 'Administrator name must be 3–32 characters.')
    config['admin_email'] = ask('Initial administrator email', validate=email)
    config['admin_password'] = ask('Initial administrator password', validate=password, secret=True)
    require(getpass.getpass('Confirm administrator password: ') == config['admin_password'], 'Passwords differ. Nothing was installed; rerun to enter them again.')
    config['demo_password'] = ask('Separate password for seeded demo accounts (including the sample admin)', validate=password, secret=True)
    require(config['demo_password'] != config['admin_password'], 'Use different passwords for the real administrator and seeded accounts.')
    require(getpass.getpass('Confirm demo account password: ') == config['demo_password'], 'Demo passwords differ. Nothing was installed.')
    config['sender_name'] = ask('Email sender display name', 'FlagArena')
    require(not any(c in config['sender_name'] for c in '<>"'), 'Sender name must not contain angle brackets or quotes.')
    config['sender_email'] = ask('Resend sender email (on your verified domain)', validate=email)
    config['resend_key'] = ask('Resend sending API key', secret=True)
    require(re.fullmatch(r're_[A-Za-z0-9_-]+', config['resend_key']), 'The Resend key format is invalid.')
    config['cert_email'] = ask('Certificate contact email', config['admin_email'], email)
    print(f'''
Before continuing, complete these settings in GCP and your DNS provider:
  • Reserve {config['ip']} as this VM's static external IP.
  • Add an A record: {config['domain']} → {config['ip']}.
  • Remove stale AAAA records; use DNS-only mode if your DNS provider offers a proxy.
  • Allow inbound TCP 80 and 443 to THIS VM in its GCP VPC firewall.
    Keep SSH limited to your administration method. Do not expose 5432 or {config['api_port']}.
  • In Resend, add and verify the domain for {config['sender_email']}.
    Copy the exact DKIM/SPF/MX records from the Resend dashboard to your DNS provider.

DNS guide: https://cloud.google.com/compute/docs/ip-addresses/reserve-static-external-ip-address
Mail DNS: https://resend.com/docs/dashboard/domains/introduction
HTTPS: Certbot will accept the Let's Encrypt subscriber agreement on your behalf:
https://letsencrypt.org/repository/

Validation sends one configuration-only message to Resend's delivered@resend.dev
test sink. It verifies the key's sending permission and your exact From address.
No message is sent to your administrator or to real players.
This is a populated demo: 40 approved challenges, workflow examples, sample users,
progress, and three events are installed. Sample administrator accounts can change
this demo database. Share their password only with trusted demonstrators; use
/preview for anonymous visitors. Do not store sensitive or real competition data.
''')
    input('When DNS, Resend verification, and firewall rules are ready, press Enter to validate (Ctrl+C cancels): ')
    validate_dns(config)
    validate_mail(config)
    print(f"\nReady to deploy https://{config['domain']}\nAdmin: {config['admin_name']} <{config['admin_email']}>\nSender: {config['sender_name']} <{config['sender_email']}>\nPublic: 80 → 443; API: 127.0.0.1:{config['api_port']}; PostgreSQL: local\nApplication: {APP}; uploads: {STATE / 'uploads'}\nPasswords, database password, and signing secret: private\n")
    require(input('Type DEPLOY to install, or anything else to cancel: ') == 'DEPLOY', 'Cancelled. No installation changes were made.')
    return config


def run(args, *, data=None, cwd=None, env=None, capture=False):
    result = subprocess.run(args, input=data, text=True, cwd=cwd, env=env,
                            stdout=subprocess.PIPE if capture else None,
                            stderr=subprocess.PIPE if capture else None, check=False)
    # Command arguments never contain credentials. Suppress captured SQL errors,
    # which can otherwise echo password-bearing statements.
    require(result.returncode == 0, f"Command failed during {STAGE}: {args[0]} (exit {result.returncode}).")
    return result.stdout or ''


def write(path, content, mode=0o644):
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    with open(path, 'w', opener=lambda p, flags: os.open(p, flags, mode)) as file:
        os.fchmod(file.fileno(), mode)
        file.write(content)


def env_text(values):
    # A double-quoted EnvironmentFile value: literal $, #, spaces and quotes.
    def quote(value):
        return '"' + one_line(str(value)).replace('\\', '\\\\').replace('"', '\\"').replace('$', '\\$').replace('`', '\\`') + '"'
    return ''.join(f'{key}={quote(value)}\n' for key, value in values.items())


def nginx_config(config, tls):
    domain = config['domain']
    webroot = 'location ^~ /.well-known/acme-challenge/ { root /var/www/flagarena-acme; }'
    if not tls:
        return f'server {{ listen 80; server_name {domain}; {webroot} location / {{ return 503; }} }}\n'
    return f'''server {{
    listen 80;
    server_name {domain};
    {webroot}
    location / {{ return 301 https://{domain}$request_uri; }}
}}
server {{
    listen 443 ssl;
    server_name {domain};
    ssl_certificate /etc/letsencrypt/live/{domain}/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/{domain}/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    root /opt/flagarena/frontend/dist;
    index index.html;
    client_max_body_size 101m;
    add_header X-Content-Type-Options nosniff always;
    add_header Referrer-Policy no-referrer always;
    add_header X-Frame-Options DENY always;
    add_header Content-Security-Policy "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self'; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'" always;
    location /api/ {{
        proxy_pass http://127.0.0.1:{config['api_port']};
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-For $remote_addr;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 120s;
        proxy_request_buffering off;
    }}
    location /assets/ {{ try_files $uri =404; expires 7d; }}
    location / {{ try_files $uri $uri/ /index.html; expires -1; }}
}}
'''


def install_node():
    arch = {'x86_64': 'x64', 'aarch64': 'arm64'}[platform.machine()]
    releases = json.loads(fetch('https://nodejs.org/dist/index.json'))
    version = next(r['version'] for r in releases if r['version'].startswith('v24.') and r['lts'])
    filename = f'node-{version}-linux-{arch}.tar.xz'
    base = f'https://nodejs.org/dist/{version}/'
    sums = fetch(base + 'SHASUMS256.txt').decode().splitlines()
    checksum = next(line.split()[0] for line in sums if line.split()[-1] == filename)
    with tempfile.TemporaryDirectory(prefix='flagarena-node-') as directory:
        archive = Path(directory) / filename
        archive.write_bytes(fetch(base + filename, timeout=180))
        require(hashlib.sha256(archive.read_bytes()).hexdigest() == checksum, 'Node archive checksum mismatch.')
        run(['tar', '-xJf', str(archive), '-C', '/opt', '--no-same-owner'])
    node_dir = Path('/opt') / f'node-{version}-linux-{arch}'
    for name in ('node', 'npm', 'npx'):
        link = Path('/usr/local/bin') / name
        require(not link.exists() and not link.is_symlink(), f'{link} already exists. Use a fresh VM.')
        link.symlink_to(node_dir / 'bin' / name)


def ensure_build_memory():
    """Add private swap on very small VMs so npm/Vite builds do not get OOM-killed."""
    memory = {}
    for line in Path('/proc/meminfo').read_text().splitlines():
        if ':' in line:
            key, value = line.split(':', 1)
            memory[key] = int(value.strip().split()[0]) * 1024
    available = memory.get('MemTotal', 0) + memory.get('SwapTotal', 0)
    if available >= 3 * 1024**3:
        return
    swap = Path('/swapfile')
    require(not swap.exists(), '/swapfile exists but total build memory is still below 3 GB. Configure working swap before rerunning.')
    size = 2 * 1024**3
    require(shutil.disk_usage('/').free >= size + 4 * 1024**3,
            'This small VM needs 2 GB of build swap and at least 4 GB additional free disk space.')
    print('Small VM detected; creating a private 2 GB swap file for dependency installation and builds.')
    if shutil.which('fallocate'):
        run(['fallocate', '-l', '2G', str(swap)])
    else:
        run(['dd', 'if=/dev/zero', f'of={swap}', 'bs=1M', 'count=2048', 'status=none'])
    swap.chmod(0o600)
    run(['mkswap', str(swap)], capture=True)
    run(['swapon', str(swap)])
    with open('/etc/fstab', 'a') as fstab:
        fstab.write('/swapfile none swap sw 0 0\n')


def install(config):
    global STAGE
    base_env = dict(os.environ, PATH='/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin', DEBIAN_FRONTEND='noninteractive')
    STAGE = 'build memory preparation'
    ensure_build_memory()
    STAGE = 'operating system packages'
    run(['apt-get', 'update'], env=base_env)
    run(['apt-get', 'install', '-y', 'ca-certificates', 'curl', 'rsync', 'xz-utils', 'build-essential', 'postgresql', 'nginx', 'certbot'], env=base_env)
    STAGE = 'Node.js'
    install_node()
    STAGE = 'application build and checks'
    run(['useradd', '--system', '--user-group', '--home-dir', str(STATE), '--create-home', '--shell', '/usr/sbin/nologin', 'flagarena'])
    APP.mkdir(mode=0o755)
    for name in ('backend', 'frontend', 'shared', 'deploy', 'docs'):
        run(['rsync', '-a', '--exclude=node_modules', '--exclude=dist', '--exclude=.env', '--exclude=.env.*', '--exclude=*.tsbuildinfo', str(ROOT / name), str(APP)])
    for name in ('package.json', 'package-lock.json', '.prettierignore', 'README.md', 'THIRD_PARTY_NOTICES.md', '.gitignore'):
        shutil.copyfile(ROOT / name, APP / name)
    run(['chown', '-R', 'flagarena:flagarena', str(APP)])
    build_env = dict(base_env, HOME=str(STATE))
    for key in ('NODE_ENV', 'DATABASE_URL', 'TEST_DATABASE_URL', 'RESEND_API_KEY', 'ADMIN_PASSWORD'):
        build_env.pop(key, None)
    for command in (['npm', 'ci'], ['npm', 'run', 'check'], ['npm', 'run', 'test:deploy'], ['npm', 'run', 'build']):
        run(['runuser', '-u', 'flagarena', '--', *command], cwd=APP, env=build_env)
    run(['chown', '-R', 'root:root', str(APP)])
    run(['chmod', '-R', 'a+rX', str(APP)])
    STAGE = 'PostgreSQL and private environment'
    run(['systemctl', 'enable', '--now', 'postgresql'])
    db_password = secrets.token_hex(32)
    # Fixed SQL identifiers and hex-only generated password; never interpolate prompts.
    run(['runuser', '-u', 'postgres', '--', 'psql', '-v', 'ON_ERROR_STOP=1', '-d', 'postgres'],
        data=f"CREATE ROLE flagarena LOGIN PASSWORD '{db_password}';\nCREATE DATABASE flagarena OWNER flagarena;\n", capture=True)
    values = {
        'NODE_ENV': 'production', 'DEMO_MODE': '1', 'HOST': '127.0.0.1', 'PORT': config['api_port'],
        'APP_URL': f"https://{config['domain']}",
        'DATABASE_URL': f'postgresql://flagarena:{db_password}@127.0.0.1:5432/flagarena',
        'JWT_SECRET': secrets.token_hex(48), 'MAIL_MODE': 'resend',
        'RESEND_API_KEY': config['resend_key'],
        'RESEND_FROM_EMAIL': f"{config['sender_name']} <{config['sender_email']}>",
        'UPLOAD_DIR': str(STATE / 'uploads'), 'MAIL_DIR': str(STATE / 'mail'), 'TRUST_PROXY': '1',
    }
    write(ENV_FILE, env_text(values), 0o600)
    for name in ('uploads', 'mail'):
        (STATE / name).mkdir(mode=0o700, exist_ok=True)
    run(['chown', '-R', 'flagarena:flagarena', str(STATE)])
    runtime_env = dict(base_env, **{k: str(v) for k, v in values.items()})
    STAGE = 'database migrations and initial administrator'
    run(['runuser', '-u', 'flagarena', '--', 'npm', 'run', 'migration:run'], cwd=APP, env=runtime_env)
    admin_env = dict(runtime_env, ADMIN_NAME=config['admin_name'], ADMIN_EMAIL=config['admin_email'], ADMIN_PASSWORD=config['admin_password'])
    run(['runuser', '-u', 'flagarena', '--', 'node', 'dist/database/create-admin.js'], cwd=APP / 'backend', env=admin_env)
    del admin_env['ADMIN_PASSWORD']
    config.pop('admin_password', None)
    STAGE = 'demo users, challenges, resources, progress and events'
    seed_env = dict(runtime_env, SEED_CONFIRM='demo-deployment', SEED_PASSWORD=config.pop('demo_password'), SEED_SAMPLES_ONLY='0')
    run(['runuser', '-u', 'flagarena', '--', 'node', 'dist/database/seeds/run-seed.js'], cwd=APP / 'backend', env=seed_env)
    del seed_env['SEED_PASSWORD']
    run(['runuser', '-u', 'flagarena', '--', 'node', 'dist/database/seeds/audit-seed.js'], cwd=APP / 'backend', env=runtime_env)
    STAGE = 'HTTPS certificate'
    (Path('/var/www/flagarena-acme') / '.well-known/acme-challenge').mkdir(parents=True, exist_ok=True)
    site = Path('/etc/nginx/sites-available/flagarena')
    write(site, nginx_config(config, tls=False))
    Path('/etc/nginx/sites-enabled/flagarena').symlink_to(site)
    run(['nginx', '-t'])
    run(['systemctl', 'enable', '--now', 'nginx'])
    run(['systemctl', 'reload', 'nginx'])
    run(['certbot', 'certonly', '--non-interactive', '--agree-tos', '--email', config['cert_email'], '--webroot', '-w', '/var/www/flagarena-acme', '-d', config['domain']])
    write(site, nginx_config(config, tls=True))
    write('/etc/letsencrypt/renewal-hooks/deploy/flagarena-nginx', '#!/bin/sh\nnginx -t && systemctl reload nginx\n', 0o755)
    run(['systemctl', 'enable', '--now', 'certbot.timer'])
    STAGE = 'application service'
    service = (ROOT / 'deploy/flagarena.service').read_text().replace('/usr/bin/node', '/usr/local/bin/node')
    write('/etc/systemd/system/flagarena.service', service)
    run(['systemctl', 'daemon-reload'])
    run(['systemctl', 'enable', '--now', 'flagarena'])
    for attempt in range(30):
        try:
            fetch(f"http://127.0.0.1:{config['api_port']}/api/ready", timeout=2)
            break
        except (OSError, urllib.error.URLError):
            require(attempt < 29, 'API readiness failed. Inspect journalctl -u flagarena.')
            time.sleep(1)
    run(['nginx', '-t'])
    run(['systemctl', 'reload', 'nginx'])
    STAGE = 'HTTPS verification and certificate renewal test'
    fetch(f"https://{config['domain']}/api/ready")
    fetch(f"https://{config['domain']}/")
    run(['certbot', 'renew', '--dry-run', '--cert-name', config['domain']])
    print(f"\nInstalled: https://{config['domain']}\nAdmin login: https://{config['domain']}/admin/login\nHTTPS: 443; redirect/certificate validation: 80. No port forwarding is required.\nConfiguration: {ENV_FILE} (root-only)\nStatus: sudo systemctl status flagarena\nLogs: sudo journalctl -u flagarena -n 100\nBack up PostgreSQL and {STATE / 'uploads'}. See docs/deployment.md.")


def preflight():
    require(sys.platform == 'linux' and os.geteuid() == 0, 'Run with sudo on the target Linux VM.')
    require(platform.machine() in ('x86_64', 'aarch64'), 'Use an x86_64 or arm64 VM.')
    os_release(Path('/etc/os-release').read_text())
    require(sys.stdin.isatty(), 'Run over an interactive SSH terminal. GCP metadata startup scripts cannot prompt.')
    require(not APP.exists() and not ENV_FILE.exists(), 'An installation or partial installation already exists. This is a first-install script; see the recovery instructions in docs/deployment.md.')
    require(not Path('/etc/nginx/sites-available/flagarena').exists(), 'An existing FlagArena Nginx site was found.')
    for name in ('node', 'npm', 'npx'):
        require(not shutil.which(name), f'{name} is already installed; use a fresh dedicated VM.')
    require(not shutil.which('psql'), 'PostgreSQL is already installed; use the manual deployment guide for an existing database.')


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--check', action='store_true', help='Check installer source inputs without prompts, network, root, or system changes')
    args = parser.parse_args()
    for name in ('package.json', 'package-lock.json', 'deploy/flagarena.service', 'backend/src/database/create-admin.ts'):
        require((ROOT / name).is_file(), f'Missing repository file: {name}')
    if args.check:
        print('Installer inputs are present. No system changes made.')
        return
    preflight()
    config = collect()
    # Check the chosen local port before changing any system state.
    with socket.socket() as connection:
        connection.bind(('127.0.0.1', config['api_port']))
    install(config)


if __name__ == '__main__':
    try:
        main()
    except (KeyboardInterrupt, EOFError):
        print(f'\nCancelled during {STAGE}.', file=sys.stderr)
        sys.exit(130)
    except (RuntimeError, OSError, ValueError, StopIteration) as error:
        print(f'\nStopped during {STAGE}: {error}', file=sys.stderr)
        print('No further steps were run. If installation had started, see the recovery section in docs/deployment.md.', file=sys.stderr)
        sys.exit(1)
