<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Back in stock</title>
</head>
<body style="margin:0;padding:0;background:#f4f2f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#1f1f1f;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f2f7;padding:24px 12px;">
    <tr>
        <td align="center">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;border-radius:12px;overflow:hidden;">
                <tr>
                    <td style="padding:28px 32px 8px;">
                        <img src="{{ file_exists($logoPath) ? $message->embed($logoPath) : $logoUrl }}" alt="{{ config('app.name') }}" width="120" style="display:block;width:120px;height:auto;border:0;">
                    </td>
                </tr>
                <tr>
                    <td style="padding:12px 32px 32px;">
                        <h1 style="margin:0 0 12px;font-size:26px;line-height:1.25;font-weight:800;">It's back in stock!</h1>
                        <p style="margin:0 0 24px;font-size:14px;line-height:1.6;">You asked us to let you know when this product returned. It's available now, while stock lasts.</p>

                        <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 24px;">
                            <tr>
                                <td style="padding-right:16px;vertical-align:middle;">
                                    <img src="{{ $imageUrl }}" alt="" width="96" height="96" style="display:block;width:96px;height:96px;object-fit:contain;border:1px solid #e7e5ea;border-radius:8px;">
                                </td>
                                <td style="vertical-align:middle;">
                                    <p style="margin:0 0 6px;font-size:15px;font-weight:700;">{{ $product->name }}</p>
                                    <p style="margin:0;font-size:15px;font-weight:800;color:#36135d;">Rs.{{ number_format($price, 2) }}</p>
                                </td>
                            </tr>
                        </table>

                        <a href="{{ $productUrl }}" style="display:inline-block;background:#36135d;color:#ffffff;font-size:14px;font-weight:700;text-decoration:none;padding:12px 24px;border-radius:8px;">Shop Now</a>

                        <p style="margin:24px 0 0;font-size:12px;line-height:1.6;color:#6b6b6b;">This is a one-time alert. We won't email you about this product again unless you ask.</p>
                    </td>
                </tr>
            </table>
        </td>
    </tr>
</table>
</body>
</html>
