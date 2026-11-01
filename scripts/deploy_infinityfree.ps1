# ==============================================================================
# CircuLink Deployment Script for InfinityFree via FTP
# ==============================================================================

# 1. Muat kredensial lokal jika ada (berkas ini diabaikan oleh .gitignore)
$localCredsFile = Join-Path $PSScriptRoot "deploy_infinityfree.local.ps1"
if (Test-Path $localCredsFile) {
    . $localCredsFile
}

# 2. Ambil dari Environment Variables jika belum diatur
if (-not $ftpHost) { $ftpHost = $env:INFINITYFREE_FTP_HOST }
if (-not $ftpUser) { $ftpUser = $env:INFINITYFREE_FTP_USER }
if (-not $ftpPass) { $ftpPass = $env:INFINITYFREE_FTP_PASS }

# 3. Validasi Kredensial
if (-not $ftpHost -or -not $ftpUser -or -not $ftpPass) {
    Write-Host "[ERROR] Kredensial FTP InfinityFree belum disetel!" -ForegroundColor Red
    Write-Host "Silakan setel melalui:" -ForegroundColor Yellow
    Write-Host "  1. Berkas 'scripts/deploy_infinityfree.local.ps1' (direkomendasikan, terabaikan dari Git)"
    Write-Host "  2. Environment Variables: `$env:INFINITYFREE_FTP_HOST, `$env:INFINITYFREE_FTP_USER, `$env:INFINITYFREE_FTP_PASS"
    exit 1
}

$remoteRoot = "ftp://$ftpHost/htdocs"

Write-Host "[DEPLOY] Starting CircuLink deployment to InfinityFree ($ftpHost)..." -ForegroundColor Cyan

function Upload-FtpFile {
    param (
        [string]$localPath,
        [string]$remoteUrl
    )
    try {
        $uri = [System.Uri]$remoteUrl
        $req = [System.Net.FtpWebRequest]::Create($uri)
        $req.Credentials = New-Object System.Net.NetworkCredential($ftpUser, $ftpPass)
        $req.Method = [System.Net.WebRequestMethods+Ftp]::UploadFile
        $req.UseBinary = $true
        $req.UsePassive = $true
        $req.KeepAlive = $false

        $bytes = [System.IO.File]::ReadAllBytes($localPath)
        $req.ContentLength = $bytes.Length

        $stream = $req.GetRequestStream()
        $stream.Write($bytes, 0, $bytes.Length)
        $stream.Close()

        $resp = $req.GetResponse()
        $resp.Close()
        Write-Host "  [OK] Uploaded: $localPath -> $remoteUrl" -ForegroundColor Green
    } catch {
        Write-Host "  [FAIL] Error uploading $localPath : $_" -ForegroundColor Red
    }
}

function Create-FtpDirectory {
    param (
        [string]$remoteDirUrl
    )
    try {
        $uri = [System.Uri]$remoteDirUrl
        $req = [System.Net.FtpWebRequest]::Create($uri)
        $req.Credentials = New-Object System.Net.NetworkCredential($ftpUser, $ftpPass)
        $req.Method = [System.Net.WebRequestMethods+Ftp]::MakeDirectory
        $req.UsePassive = $true
        $req.KeepAlive = $false
        $resp = $req.GetResponse()
        $resp.Close()
        Write-Host "  [DIR] Created directory: $remoteDirUrl" -ForegroundColor Yellow
    } catch {
        # Directory might already exist, ignore error
    }
}

function Remove-FtpFile {
    param (
        [string]$remoteFileUrl
    )
    try {
        $uri = [System.Uri]$remoteFileUrl
        $req = [System.Net.FtpWebRequest]::Create($uri)
        $req.Credentials = New-Object System.Net.NetworkCredential($ftpUser, $ftpPass)
        $req.Method = [System.Net.WebRequestMethods+Ftp]::DeleteFile
        $req.UsePassive = $true
        $req.KeepAlive = $false
        $resp = $req.GetResponse()
        $resp.Close()
        Write-Host "  [CLEAN] Deleted old placeholder: $remoteFileUrl" -ForegroundColor DarkGray
    } catch {
        # File might not exist, ignore error
    }
}

# 1. Clean default InfinityFree placeholder (index2.html)
Remove-FtpFile "$remoteRoot/index2.html"

# 2. Upload Root Files
Upload-FtpFile "index.html" "$remoteRoot/index.html"
Upload-FtpFile ".htaccess" "$remoteRoot/.htaccess"
Upload-FtpFile "README.md" "$remoteRoot/README.md"

# 3. Create & Upload Directories
$directories = @("css", "assets", "api", "js")
foreach ($dir in $directories) {
    if (Test-Path $dir) {
        Create-FtpDirectory "$remoteRoot/$dir"
        $files = Get-ChildItem -Path $dir -File
        foreach ($file in $files) {
            $localFilePath = "$dir/$($file.Name)"
            $remoteFilePath = "$remoteRoot/$dir/$($file.Name)"
            Upload-FtpFile $localFilePath $remoteFilePath
        }
    }
}

Write-Host "[DEPLOY DONE] Deployment ke InfinityFree selesai!" -ForegroundColor Green
