// Dark-theme verification email. Styles are inline because mail clients strip <style> blocks.
export function verificationEmail(code: string) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="dark light">
<title>Your FlagArena verification code</title>
</head>
<body style="margin:0; padding:32px 16px; background:#0a0c0b; font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">

  <!-- Inbox preview text, hidden in the body -->
  <div style="display:none; max-height:0; overflow:hidden;">
    Your FlagArena verification code is ${code}. It expires in 10 minutes.
  </div>

  <div style="max-width:560px; margin:0 auto; background:#0f1211; border:1px solid #1e2321; border-radius:14px;">

    <div style="padding:28px 32px 20px; border-bottom:1px solid #1a1f1d; font-size:20px; font-weight:700; letter-spacing:-0.3px; color:#ffffff;">
      Flag<span style="color:#7ee8a8;">Arena</span>
    </div>

    <div style="padding:32px 32px 0;">
      <h1 style="margin:0 0 12px; font-size:24px; line-height:32px; letter-spacing:-0.4px; color:#ffffff;">
        Confirm your email address.
      </h1>
      <p style="margin:0; font-size:15px; line-height:24px; color:#9aa5a0;">
        Enter the code below to finish creating your FlagArena account. The code expires in 10 minutes.
      </p>
    </div>

    <div style="margin:24px 32px 0; padding:24px 16px 22px; background:#111514; border:1px solid #232927; border-radius:12px; text-align:center;">
      <p style="margin:0 0 10px; font-size:11px; font-weight:600; letter-spacing:1.2px; text-transform:uppercase; color:#7a857f;">
        Verification code
      </p>
      <!-- padding-left offsets the trailing letter-space so the digits look centred -->
      <p style="margin:0; padding-left:9px; font-family:'SF Mono',Menlo,Consolas,monospace; font-size:38px; line-height:46px; font-weight:700; letter-spacing:9px; color:#7ee8a8;">
        ${code}
      </p>
    </div>

    <p style="margin:22px 32px 30px; font-size:13px; line-height:21px; color:#6f7a75;">
      If you did not request this code, no action is required. Do not share this code with anyone.
    </p>

    <div style="padding:20px 32px 26px; border-top:1px solid #1a1f1d; font-size:12px; line-height:18px;">
      <p style="margin:0 0 6px; color:#5d6763;">FlagArena &middot; Self-hosted. Community-driven.</p>
      <p style="margin:0; color:#4c5551;">
        Sent to you because an account was created with this address.
      </p>
    </div>

  </div>

  <p style="max-width:560px; margin:18px auto 0; font-size:11px; line-height:16px; color:#3f4744; text-align:center;">
    &copy; FlagArena. All rights reserved.
  </p>

</body>
</html>`;
}
