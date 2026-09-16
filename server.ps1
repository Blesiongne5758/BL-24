# Simple Local Web Server for Bursa Limbah Platform
param (
    [int]$Port = 5000
)

$HostName = "localhost"
$Prefix = "http://${HostName}:${Port}/"
$RootPath = (Get-Item -Path ".").FullName

$MimeTypes = @{
    ".html" = "text/html; charset=utf-8"
    ".htm"  = "text/html; charset=utf-8"
    ".css"  = "text/css; charset=utf-8"
    ".js"   = "application/javascript; charset=utf-8"
    ".json" = "application/json; charset=utf-8"
    ".png"  = "image/png"
    ".jpg"  = "image/jpeg"
    ".jpeg" = "image/jpeg"
    ".gif"  = "image/gif"
    ".svg"  = "image/svg+xml"
    ".ico"  = "image/x-icon"
    ".txt"  = "text/plain; charset=utf-8"
    ".md"   = "text/plain; charset=utf-8"
}

$Listener = New-Object System.Net.HttpListener
$Listener.Prefixes.Add($Prefix)

try {
    $Listener.Start()
    Write-Host "=====================================================" -ForegroundColor Green
    Write-Host "  Bursa Limbah Server Berjalan di Port ${Port}!" -ForegroundColor Green
    Write-Host "  URL: $Prefix" -ForegroundColor Cyan
    Write-Host "  Directory: $RootPath" -ForegroundColor Yellow
    Write-Host "=====================================================" -ForegroundColor Green
    
    # Auto open browser
    Start-Process $Prefix
} catch {
    Write-Error "Gagal menjalankan HTTP server pada port ${Port}. Error: $_"
    exit 1
}

while ($Listener.IsListening) {
    try {
        $Context = $Listener.GetContext()
        $Request = $Context.Request
        $Response = $Context.Response

        $UrlPath = [System.Uri]::UnescapeDataString($Request.Url.AbsolutePath)

        # Handle CORS OPTIONS Preflight
        if ($Request.HttpMethod -eq "OPTIONS") {
            $Response.StatusCode = 200
            $Response.AddHeader("Access-Control-Allow-Origin", "*")
            $Response.AddHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
            $Response.AddHeader("Access-Control-Allow-Headers", "Content-Type, Authorization")
            $Response.OutputStream.Close()
            continue
        }

        # Handle API Health Check
        if ($UrlPath -eq "/api/health") {
            $HealthJson = '{"status":"ok","server":"bursalimbah-http","port":' + $Port + ',"database":"hybrid-ready","timestamp":"' + (Get-Date -Format s) + '"}'
            $Bytes = [System.Text.Encoding]::UTF8.GetBytes($HealthJson)
            $Response.ContentType = "application/json; charset=utf-8"
            $Response.ContentLength64 = $Bytes.Length
            $Response.StatusCode = 200
            $Response.AddHeader("Access-Control-Allow-Origin", "*")
            $Response.OutputStream.Write($Bytes, 0, $Bytes.Length)
            $Response.OutputStream.Close()
            continue
        }

        if ($UrlPath -eq "/" -or $UrlPath -eq "") {
            $UrlPath = "/index.html"
        }

        # Normalize relative path
        $CleanRelPath = $UrlPath.TrimStart('/').Replace('/', [System.IO.Path]::DirectorySeparatorChar)
        $FilePath = Join-Path $RootPath $CleanRelPath

        if (Test-Path -Path $FilePath -PathType Leaf) {
            $Ext = [System.IO.Path]::GetExtension($FilePath).ToLower()
            $ContentType = $MimeTypes[$Ext]
            if (-not $ContentType) {
                $ContentType = "application/octet-stream"
            }

            $Bytes = [System.IO.File]::ReadAllBytes($FilePath)
            $Response.ContentType = $ContentType
            $Response.ContentLength64 = $Bytes.Length
            $Response.StatusCode = 200
            $Response.AddHeader("Access-Control-Allow-Origin", "*")
            $Response.AddHeader("Cache-Control", "no-cache")
            $Response.OutputStream.Write($Bytes, 0, $Bytes.Length)
        } else {
            $Response.StatusCode = 404
            $NotFoundMsg = [System.Text.Encoding]::UTF8.GetBytes("404 Not Found: $UrlPath")
            $Response.ContentType = "text/plain; charset=utf-8"
            $Response.ContentLength64 = $NotFoundMsg.Length
            $Response.OutputStream.Write($NotFoundMsg, 0, $NotFoundMsg.Length)
        }

        $Response.OutputStream.Close()
    } catch {
        # Catch client disconnects gracefully
    }
}
