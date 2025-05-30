# ������Ʈ ��Ʈ ���丮 ���� (���� ��ũ��Ʈ�� �ִ� ���丮)
$projectPath = $PSScriptRoot

# ������ Ȯ���� (���̳ʸ� ���� ��)
$excludedExtensions = @(".exe", ".dll", ".png", ".jpg", ".jpeg", ".gif", ".bmp", ".zip", ".tar", ".gz", ".ico", ".pdb", ".pdf")

# ������ Ư�� ���� �̸� (��ҹ��� ���� ����)
$excludedFileNames = @("LICENSE", "README.md", "env.example")

# ������ ���丮
$excludedDirectories = @("node_modules", ".git", "dist", "uploads")

# ��ü �� �� �� ���� �� �ʱ�ȭ
$totalLines = 0
$totalCharacters = 0
$fileCount = 0

Write-Output "������Ʈ ���: $projectPath"
Write-Output "���� ��ĵ ��..."

# ��� ���� �˻� (���)
Get-ChildItem -Path $projectPath -Recurse -File | Where-Object {
    # ������ ���丮 üũ
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
        Write-Output "ó����: $($_.Name) ($lineCount ��, $charCount ����)"
    }
    catch {
        Write-Warning "������ �д� �� ���� �߻�: $($_.FullName) - $($_.Exception.Message)"
    }
}

Write-Output ""
Write-Output "=== ��� ==="
Write-Output "ó���� ���� ��: $fileCount"
Write-Output "�� �� �� (���� ��� ����): $totalLines"
Write-Output "�� ���� �� (���� ��� ����): $totalCharacters"
