$d = "D:\NEW PIYUSH\Fontana-Firenze-Website"
New-Item -ItemType Directory -Force -Path "$d\assets\images" | Out-Null

$svg = @'
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <rect width="64" height="64" rx="14" fill="#211F1A"/>
  <circle cx="32" cy="32" r="25" fill="none" stroke="#D5B58E" stroke-width="2"/>
  <path d="M18 32c0-9 6.3-15 14-15s14 6 14 15" fill="none" stroke="#D8A96A" stroke-width="2.6" stroke-linecap="round"/>
  <line x1="32" y1="15" x2="32" y2="46" stroke="#D8A96A" stroke-width="2.4" stroke-linecap="round"/>
  <path d="M17 33h30" stroke="#F6F1E8" stroke-width="2.4" stroke-linecap="round"/>
  <path d="M22 46h20" stroke="#F6F1E8" stroke-width="2.8" stroke-linecap="round"/>
</svg>
'@
Set-Content -Path "$d\assets\images\favicon.svg" -Value $svg -Encoding UTF8

Add-Type -AssemblyName System.Drawing
$bmp = New-Object System.Drawing.Bitmap(64, 64)
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.SmoothingMode = 'AntiAlias'
$g.Clear([System.Drawing.Color]::FromArgb(33, 31, 26))

$penGold = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(216, 169, 106), 3)
$penRing = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(213, 181, 142), 2)
$penCream = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(246, 241, 232), 3)

$g.DrawEllipse($penRing, 6, 6, 52, 52)
$g.DrawArc($penGold, 16, 16, 32, 28, 180, 180)
$g.DrawLine($penGold, 32, 14, 32, 48)
$g.DrawLine($penCream, 16, 33, 48, 33)
$g.DrawLine($penCream, 21, 48, 43, 48)

$bmp.Save("$d\assets\images\favicon.png", [System.Drawing.Imaging.ImageFormat]::Png)

$hIcon = $bmp.GetHicon()
$ico = [System.Drawing.Icon]::FromHandle($hIcon)
$fs = [System.IO.File]::Open("$d\favicon.ico", [System.IO.FileMode]::Create)
$ico.Save($fs)
$fs.Close()

$g.Dispose()
$bmp.Dispose()

$iconTags = "  <link rel=`"icon`" type=`"image/svg+xml`" href=`"assets/images/favicon.svg?v=3`">`n  <link rel=`"icon`" type=`"image/png`" sizes=`"32x32`" href=`"assets/images/favicon.png?v=3`">`n  <link rel=`"shortcut icon`" href=`"favicon.ico?v=3`">"

Get-ChildItem -Path $d -Include *.html -Recurse | ForEach-Object {
  $c = Get-Content $_.FullName -Raw -Encoding UTF8
  $c = [regex]::Replace($c, '<link[^>]*rel=[\"\x27](?:shortcut )?icon[\"\x27][^>]*>\r?\n?', '')
  $c = $c -replace '</head>', ($iconTags + "`n</head>")
  Set-Content -Path $_.FullName -Value $c -Encoding UTF8
}

Write-Host "Favicon files created and HTML files updated."