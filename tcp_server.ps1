# ==========================================================================
# COMPETITION MANAGEMENT SYSTEM - HIGH-PERFORMANCE TCP WEB SERVER (tcp_server.ps1)
# Accepts all Host headers from tunnels, Netlify proxies, and local clients
# ==========================================================================

$port = 8080
$rootPath = $PSScriptRoot

$listener = [System.Net.Sockets.TcpListener]::new([System.Net.IPAddress]::Any, $port)
$listener.Start()

Write-Host "======================================================================" -ForegroundColor Green
Write-Host "🚀 High-Performance TCP Web Server running on 0.0.0.0:$port" -ForegroundColor Cyan
Write-Host "======================================================================" -ForegroundColor Green

while ($listener.Server.IsBound) {
    try {
        $client = $listener.AcceptTcpClient()
        [System.Threading.ThreadPool]::QueueUserWorkItem({
            param($state)
            $tcpClient = $state[0]
            $baseDir = $state[1]
            $types = @{
                ".html" = "text/html; charset=utf-8"
                ".css"  = "text/css; charset=utf-8"
                ".js"   = "application/javascript; charset=utf-8"
                ".json" = "application/json; charset=utf-8"
                ".png"  = "image/png"
                ".jpg"  = "image/jpeg"
                ".svg"  = "image/svg+xml"
            }
            try {
                $stream = $tcpClient.GetStream()
                $buffer = New-Object byte[] 4096
                $read = $stream.Read($buffer, 0, $buffer.Length)
                if ($read -gt 0) {
                    $requestString = [System.Text.Encoding]::UTF8.GetString($buffer, 0, $read)
                    $firstLine = ($requestString -split "`r`n")[0]
                    $parts = $firstLine -split " "
                    
                    $urlPath = if ($parts.Length -gt 1) { $parts[1] } else { "/" }
                    if ($urlPath.Contains("?")) { $urlPath = $urlPath.Split("?")[0] }
                    $relativePath = $urlPath.TrimStart('/')
                    if ([string]::IsNullOrWhiteSpace($relativePath)) { $relativePath = "index.html" }

                    $filePath = Join-Path $baseDir $relativePath

                    if (Test-Path $filePath -PathType Leaf) {
                        $ext = [System.IO.Path]::GetExtension($filePath).ToLower()
                        $contentType = $types[$ext]
                        if (-not $contentType) { $contentType = "application/octet-stream" }

                        $fileBytes = [System.IO.File]::ReadAllBytes($filePath)
                        $header = "HTTP/1.1 200 OK`r`nContent-Type: $contentType`r`nContent-Length: $($fileBytes.Length)`r`nAccess-Control-Allow-Origin: *`r`nConnection: close`r`n`r`n"
                        $headerBytes = [System.Text.Encoding]::UTF8.GetBytes($header)

                        $stream.Write($headerBytes, 0, $headerBytes.Length)
                        $stream.Write($fileBytes, 0, $fileBytes.Length)
                    } else {
                        $notFound = "HTTP/1.1 404 Not Found`r`nContent-Type: text/html`r`nConnection: close`r`n`r`n<h1>404 Not Found</h1>"
                        $nfBytes = [System.Text.Encoding]::UTF8.GetBytes($notFound)
                        $stream.Write($nfBytes, 0, $nfBytes.Length)
                    }
                }
            } catch {
            } finally {
                $tcpClient.Close()
            }
        }, @($client, $rootPath)) | Out-Null
    } catch {
    }
}
