# Upload the static app and PHP API to InfinityFree /htdocs over FTP.
$ErrorActionPreference = 'Stop'
$repoRoot = Split-Path -Parent $PSScriptRoot
$localCredsFile = Join-Path $PSScriptRoot 'deploy_infinityfree.local.ps1'
if (Test-Path -LiteralPath $localCredsFile) { . $localCredsFile }

if (-not $ftpHost) { $ftpHost = $env:INFINITYFREE_FTP_HOST }
if (-not $ftpUser) { $ftpUser = $env:INFINITYFREE_FTP_USER }
if (-not $ftpPass) { $ftpPass = $env:INFINITYFREE_FTP_PASS }
if (-not $ftpHost -or -not $ftpUser -or -not $ftpPass) {
    throw 'Atur INFINITYFREE_FTP_HOST, INFINITYFREE_FTP_USER, INFINITYFREE_FTP_PASS atau scripts/deploy_infinityfree.local.ps1.'
}

$remoteRoot = "ftp://$ftpHost/htdocs"
$allowedRoots = @('index.html', '.htaccess', 'hero.jpg', 'css', 'assets', 'js', 'api')
$excludedNames = @('config.local.php', 'deploy_infinityfree.local.ps1')
$failed = [System.Collections.Generic.List[string]]::new()

function Convert-ToFtpPath([string]$RelativePath) {
    $normalized = $RelativePath -replace '\\', '/'
    $segments = $normalized -split '/'
    $escaped = $segments | ForEach-Object { [Uri]::EscapeDataString($_) }
    return [string]::Join('/', [string[]]$escaped)
}

function Invoke-FtpRequest([string]$Url, [string]$Method, [byte[]]$Body = $null) {
    $request = [System.Net.FtpWebRequest]::Create([Uri]$Url)
    $request.Credentials = [System.Net.NetworkCredential]::new($ftpUser, $ftpPass)
    $request.Method = $Method
    $request.UseBinary = $true
    $request.UsePassive = $true
    $request.KeepAlive = $false
    if ($null -ne $Body) {
        $request.ContentLength = $Body.Length
        $stream = $request.GetRequestStream()
        try { $stream.Write($Body, 0, $Body.Length) } finally { $stream.Dispose() }
    }
    $response = $request.GetResponse()
    $response.Dispose()
}

function Ensure-FtpDirectory([string]$RelativeDirectory) {
    $current = $remoteRoot
    $normalized = $RelativeDirectory -replace '\\', '/'
    foreach ($segment in ($normalized -split '/')) {
        if (-not $segment) { continue }
        $current = "$current/$(Convert-ToFtpPath $segment)"
        try { Invoke-FtpRequest $current ([System.Net.WebRequestMethods+Ftp]::MakeDirectory) } catch {
            # A failed MKD is acceptable only when the directory already exists.
            try { Invoke-FtpRequest $current ([System.Net.WebRequestMethods+Ftp]::ListDirectory); } catch { throw }
        }
    }
}

$files = foreach ($root in $allowedRoots) {
    $path = Join-Path $repoRoot $root
    if (Test-Path -LiteralPath $path -PathType Leaf) { Get-Item -LiteralPath $path }
    elseif (Test-Path -LiteralPath $path -PathType Container) { Get-ChildItem -LiteralPath $path -File -Recurse }
}

# Remove InfinityFree's default placeholder if present.
try { Invoke-FtpRequest "$remoteRoot/index2.html" ([System.Net.WebRequestMethods+Ftp]::DeleteFile) } catch { }

foreach ($file in $files) {
    if ($excludedNames -contains $file.Name) { continue }
    $relative = $file.FullName.Substring($repoRoot.Length).TrimStart('\', '/')
    $directory = Split-Path -Parent $relative
    try {
        if ($directory) { Ensure-FtpDirectory $directory }
        $remotePath = Convert-ToFtpPath $relative
        Invoke-FtpRequest "$remoteRoot/$remotePath" ([System.Net.WebRequestMethods+Ftp]::UploadFile) ([System.IO.File]::ReadAllBytes($file.FullName))
        Write-Host "[OK] $relative"
    } catch {
        $failed.Add("$relative : $($_.Exception.Message)")
        Write-Host "[FAIL] $relative : $($_.Exception.Message)" -ForegroundColor Red
    }
}

if ($failed.Count) { throw "Upload gagal untuk $($failed.Count) file(s): $($failed -join '; ')" }
Write-Host "[DEPLOY DONE] $($files.Count) file(s) diunggah ke $ftpHost/htdocs" -ForegroundColor Green
