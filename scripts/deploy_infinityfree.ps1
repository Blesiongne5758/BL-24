# ==============================================================================
# CircuLink Deployment Script for InfinityFree via FTP
# ==============================================================================

$ftpHost = $env:BL24_FTP_HOST
$ftpUser = $env:BL24_FTP_USERNAME
$ftpPass = $env:BL24_FTP_PASSWORD
$remoteRoot = "ftp://$ftpHost/htdocs"

if ([string]::IsNullOrWhiteSpace($ftpHost) -or [string]::IsNullOrWhiteSpace($ftpUser) -or [string]::IsNullOrWhiteSpace($ftpPass)) {
    throw 'Set BL24_FTP_HOST, BL24_FTP_USERNAME, and BL24_FTP_PASSWORD outside the repository.'
}

Write-Host "[DEPLOY] Starting CircuLink deployment to InfinityFree ($ftpHost)..." -ForegroundColor Cyan

function Upload-FtpFile {
    param (
        [string]$localPath,
        [string]$remoteUrl
    )
    try {
        $uri = [System.Uri]$remoteUrl
        $req = [System.Net.FtpWebRequest]::Create($uri)
        $req.EnableSsl = $true
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
        $req.EnableSsl = $true
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
        $req.EnableSsl = $true
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

Write-Host "`n[DEPLOY SUCCESS] CircuLink deployment to InfinityFree completed successfully!" -ForegroundColor Cyan
