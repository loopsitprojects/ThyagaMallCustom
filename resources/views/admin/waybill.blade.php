<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Merchant Waybill - Order #{{ $order['order_number'] ?? '' }}</title>
    <style>
        * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
        }
        body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
            background-color: #f3f4f6;
            color: #111827;
            padding: 24px 12px;
        }
        .actions-bar {
            max-width: 800px;
            margin: 0 auto 20px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            background: #ffffff;
            padding: 12px 20px;
            border-radius: 12px;
            box-shadow: 0 1px 3px rgba(0,0,0,0.1);
        }
        .btn {
            display: inline-flex;
            align-items: center;
            gap: 6px;
            padding: 8px 16px;
            font-size: 13px;
            font-weight: 700;
            border-radius: 8px;
            cursor: pointer;
            text-decoration: none;
            border: none;
            transition: all 0.2s;
        }
        .btn-primary {
            background-color: #36135d;
            color: #ffffff;
        }
        .btn-primary:hover {
            background-color: #4a1d7c;
        }
        .btn-secondary {
            background-color: #e5e7eb;
            color: #374151;
        }
        .btn-secondary:hover {
            background-color: #d1d5db;
        }

        .waybill-sheet {
            max-width: 800px;
            margin: 0 auto 30px;
            background: #ffffff;
            padding: 40px 48px;
            border-radius: 4px;
            box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);
            color: #000000;
            page-break-after: always;
        }
        .waybill-sheet:last-child {
            page-break-after: auto;
        }

        .header {
            text-align: center;
            margin-bottom: 8px;
        }
        .logo-img {
            max-height: 52px;
            width: auto;
            display: block;
            margin: 0 auto 10px;
        }
        .form-title {
            font-family: Georgia, "Times New Roman", serif;
            font-size: 18px;
            letter-spacing: 0.38em;
            text-transform: uppercase;
            font-weight: 700;
            color: #111111;
            margin-top: 6px;
            margin-bottom: 12px;
        }
        .divider {
            border-bottom: 2px solid #000000;
            margin-bottom: 18px;
        }

        .meta-grid {
            display: grid;
            grid-template-columns: 1.1fr 1fr;
            gap: 20px;
            margin-bottom: 18px;
            font-size: 12px;
            line-height: 1.8;
            font-family: monospace, -apple-system, sans-serif;
            font-weight: 600;
            text-transform: uppercase;
        }
        .meta-col {
            display: flex;
            flex-direction: column;
        }
        .meta-row {
            display: flex;
            justify-content: space-between;
        }
        .meta-label {
            font-weight: 700;
            min-width: 130px;
        }
        .meta-value {
            font-weight: 600;
            flex: 1;
        }

        .table-wrap {
            border: 2px solid #000000;
            margin-bottom: 24px;
        }
        .order-table {
            width: 100%;
            border-collapse: collapse;
            font-size: 11.5px;
            font-family: monospace, -apple-system, sans-serif;
        }
        .order-table th {
            padding: 8px 10px;
            font-weight: 700;
            text-transform: uppercase;
            border-bottom: 1px solid #000000;
            background: #ffffff;
        }
        .order-table th.col-item {
            text-align: left;
            width: 54%;
            border-right: 1px solid #000000;
        }
        .order-table th.col-qty {
            text-align: center;
            width: 12%;
            border-right: 1px solid #000000;
        }
        .order-table th.col-price {
            text-align: right;
            width: 17%;
            border-right: 1px solid #000000;
        }
        .order-table th.col-total {
            text-align: right;
            width: 17%;
        }
        .sub-bar {
            display: block;
            font-size: 9px;
            letter-spacing: -1px;
            margin-top: -2px;
            color: #333333;
        }

        .order-table td {
            padding: 7px 10px;
            border-bottom: 1px solid #d1d5db;
            vertical-align: middle;
        }
        .order-table td.cell-item {
            border-right: 1px solid #000000;
            font-weight: 600;
        }
        .order-table td.cell-qty {
            text-align: center;
            border-right: 1px solid #000000;
        }
        .order-table td.cell-price {
            text-align: right;
            border-right: 1px solid #000000;
        }
        .order-table td.cell-total {
            text-align: right;
            font-weight: 700;
        }

        .order-table tr.blank-row td {
            height: 24px;
        }

        /* Summary & Signatures block */
        .bottom-section {
            display: grid;
            grid-template-columns: 1fr 1fr;
            border-top: 1px solid #000000;
            font-family: monospace, -apple-system, sans-serif;
            font-size: 11.5px;
        }
        .signatures-col {
            padding: 14px 14px 14px 10px;
            border-right: 1px solid #000000;
            display: flex;
            flex-direction: column;
            justify-content: center;
            gap: 16px;
        }
        .signature-line {
            display: flex;
            align-items: baseline;
            gap: 6px;
            font-weight: 700;
        }
        .signature-rule {
            flex: 1;
            border-bottom: 1px solid #000000;
            height: 1px;
            display: inline-block;
        }

        .totals-col {
            padding: 10px 14px;
            display: flex;
            flex-direction: column;
            gap: 6px;
        }
        .totals-row {
            display: flex;
            justify-content: space-between;
            font-weight: 700;
            text-transform: uppercase;
        }
        .grand-total-row {
            border-top: 1px solid #000000;
            padding-top: 6px;
            margin-top: 4px;
            font-size: 12.5px;
            font-weight: 800;
        }

        .footer {
            display: flex;
            justify-content: space-between;
            align-items: center;
            font-size: 11.5px;
            font-family: monospace, -apple-system, sans-serif;
            font-weight: 700;
            text-transform: uppercase;
            padding-top: 8px;
        }

        @media print {
            body {
                background: #ffffff !important;
                padding: 0 !important;
            }
            .actions-bar {
                display: none !important;
            }
            .waybill-sheet {
                box-shadow: none !important;
                padding: 20px 24px !important;
                margin: 0 !important;
                max-width: 100% !important;
                page-break-after: always;
            }
            .waybill-sheet:last-child {
                page-break-after: auto;
            }
            @page {
                size: A4 portrait;
                margin: 12mm 10mm;
            }
        }
    </style>
</head>
<body>

    <div class="actions-bar">
        <div>
            <strong>Order #{{ $order['order_number'] }}</strong> &bull;
            <span>{{ count($waybills) }} Merchant Waybill(s)</span>
        </div>
        <div style="display: flex; gap: 8px;">
            <button onclick="window.print()" class="btn btn-primary">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 6 2 18 2 18 9"></polyline><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg>
                Print / Save PDF
            </button>
            <a href="javascript:window.close()" class="btn btn-secondary">Close</a>
        </div>
    </div>

    @foreach ($waybills as $wb)
        <div class="waybill-sheet">
            <!-- Header with Logo and Title -->
            <div class="header">
                <img src="{{ $logoUrl }}" alt="Thyaga Mall" class="logo-img">
                <div class="form-title">O R D E R &nbsp; F O R M</div>
            </div>

            <div class="divider"></div>

            <!-- Metadata 2 Columns -->
            <div class="meta-grid">
                <div class="meta-col">
                    <div class="meta-row">
                        <span class="meta-label">ORDER NO:</span>
                        <span class="meta-value">{{ $wb['order_no'] }}</span>
                    </div>
                    <div class="meta-row">
                        <span class="meta-label">MERCHANT:</span>
                        <span class="meta-value">{{ $wb['merchant']['name'] }}</span>
                    </div>
                    <div class="meta-row">
                        <span class="meta-label">MERCHANT CODE:</span>
                        <span class="meta-value">{{ $wb['merchant']['code'] }}</span>
                    </div>
                </div>

                <div class="meta-col">
                    <div class="meta-row">
                        <span class="meta-label">DATE:</span>
                        <span class="meta-value">{{ $wb['date'] }}</span>
                    </div>
                    <div class="meta-row">
                        <span class="meta-label">DELIVERY DATE:</span>
                        <span class="meta-value">{{ $wb['delivery_date'] }}</span>
                    </div>
                    <div class="meta-row">
                        <span class="meta-label">DELIVERY ADDRESS:</span>
                        <span class="meta-value">{{ $wb['delivery_address'] }}</span>
                    </div>
                </div>
            </div>

            <!-- Table -->
            <div class="table-wrap">
                <table class="order-table">
                    <thead>
                        <tr>
                            <th class="col-item">ITEM</th>
                            <th class="col-qty">QTY<span class="sub-bar">---</span></th>
                            <th class="col-price">PRICE<span class="sub-bar">---</span></th>
                            <th class="col-total">TOTAL<span class="sub-bar">---</span></th>
                        </tr>
                    </thead>
                    <tbody>
                        @foreach ($wb['items'] as $item)
                            <tr>
                                <td class="cell-item">
                                    {{ $item['product_name'] }}
                                    @if (!empty($item['sku']))
                                        <span style="font-size: 10px; color: #555;">({{ $item['sku'] }})</span>
                                    @endif
                                </td>
                                <td class="cell-qty">{{ $item['quantity'] }}</td>
                                <td class="cell-price">{{ number_format((float) $item['unit_price'], 2, '.', '') }}</td>
                                <td class="cell-total">{{ number_format((float) $item['total_price'], 2, '.', '') }}</td>
                            </tr>
                        @endforeach

                        {{-- Blank filler rows to replicate the paper form structure --}}
                        @php
                            $blankCount = max(2, 10 - count($wb['items']));
                        @endphp
                        @for ($i = 0; $i < $blankCount; $i++)
                            <tr class="blank-row">
                                <td class="cell-item">&nbsp;</td>
                                <td class="cell-qty">&nbsp;</td>
                                <td class="cell-price">&nbsp;</td>
                                <td class="cell-total">&nbsp;</td>
                            </tr>
                        @endfor
                    </tbody>
                </table>

                <!-- Bottom Section (Pickup / Delivery & Totals) -->
                <div class="bottom-section">
                    <div class="signatures-col">
                        <div class="signature-line">
                            <span>Pickup-</span>
                            <span class="signature-rule"></span>
                        </div>
                        <div class="signature-line">
                            <span>Delivery-</span>
                            <span class="signature-rule"></span>
                        </div>
                    </div>

                    <div class="totals-col">
                        <div class="totals-row">
                            <span>SUBTOTAL</span>
                            <span>{{ number_format((float) $wb['subtotal'], 2) }}</span>
                        </div>
                        <div class="totals-row">
                            <span>DELIVERY CHARGES</span>
                            <span>{{ (float) $wb['delivery_charges'] > 0 ? number_format((float) $wb['delivery_charges'], 2) : '-' }}</span>
                        </div>
                        <div class="totals-row grand-total-row">
                            <span>GRAND TOTAL</span>
                            <span>{{ number_format((float) $wb['grand_total'], 2) }}</span>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Footer -->
            <div class="footer">
                <div>{{ $wb['store_address'] }}</div>
                <div>{{ $wb['dispatch_contact'] }}</div>
            </div>
        </div>
    @endforeach

</body>
</html>
