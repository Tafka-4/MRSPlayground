# 프로젝트 루트 디렉토리 설정 (현재 스크립트가 있는 디렉토리)
$projectPath = $PSScriptRoot

# 제외할 확장자 (바이너리 파일 등)
$excludedExtensions = @(".exe", ".dll", ".png", ".jpg", ".jpeg", ".gif", ".bmp", ".zip", ".tar", ".gz", ".ico", ".pdb", ".pdf")

# 제외할 특정 파일 이름 (대소문자 구분 없이)
$excludedFileNames = @("LICENSE", "README.md", "env.example")

# 제외할 디렉토리
$excludedDirectories = @("node_modules", ".git", "dist", "uploads")

# 전체 줄 수 및 글자 수 초기화
$totalLines = 0
$totalCharacters = 0
$fileCount = 0

Write-Output "프로젝트 경로: $projectPath"
Write-Output "파일 스캔 중..."

# 모든 파일 검색 (재귀)
Get-ChildItem -Path $projectPath -Recurse -File | Where-Object {
    # 제외할 디렉토리 체크
    $shouldExclude = $false
    foreach ($excludedDir in $excludedDirectories) {
        if ($_.FullName -match [regex]::Escape($excludedDir)) {
            $shouldExclude = $true
            break
        }
    }
    -not $shouldExclude
} | Where-Object {
    $ext = $_.Extension.ToLower()
    $name = $_.Name
    -not ($excludedExtensions -contains $ext) -and
    -not ($excludedFileNames -contains $name)
} | ForEach-Object {
    try {
        $content = Get-Content $_.FullName -ErrorAction Stop -Raw
        if ($content) {
            $lineCount = ($content -split "`n").Count
            $charCount = $content.Length
        }
        else {
            $lineCount = 0
            $charCount = 0
        }
        $totalLines += $lineCount
        $totalCharacters += $charCount
        $fileCount++
        Write-Output "처리됨: $($_.Name) ($lineCount 줄, $charCount 글자)"
    }
    catch {
        Write-Warning "파일을 읽는 중 오류 발생: $($_.FullName) - $($_.Exception.Message)"
    }
}

Write-Output ""
Write-Output "=== 결과 ==="
Write-Output "처리된 파일 수: $fileCount"
Write-Output "총 줄 수 (제외 대상 제외): $totalLines"
Write-Output "총 글자 수 (제외 대상 제외): $totalCharacters"
