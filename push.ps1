# GitHub 푸시 스크립트 - 이 파일을 더블클릭하거나 터미널에서 .\push.ps1 실행
# 토큰 입력 시 repo 권한이 있는 Personal Access Token 사용 (GitHub > Settings > Developer settings > PAT)
$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot

$remote = "https://github.com/yw342/260311.git"
Write-Host "GitHub 토큰을 입력하세요 (repo 권한 필요, 입력 내용은 화면에 보이지 않음):"
$token = Read-Host -AsSecureString
$BSTR = [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($token)
$plainToken = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto($BSTR)
[System.Runtime.InteropServices.Marshal]::ZeroFreeBSTR($BSTR)

if ([string]::IsNullOrWhiteSpace($plainToken)) {
    Write-Host "토큰이 비어 있습니다. 종료합니다."
    exit 1
}

$urlWithToken = "https://yw342:$plainToken@github.com/yw342/260311.git"
$plainToken = $null

try {
    git remote set-url origin $urlWithToken
    git push -u origin main
    Write-Host "푸시 완료."
} catch {
    Write-Host "푸시 실패. 토큰에 repo 권한이 있는지 확인하세요."
    exit 1
} finally {
    git remote set-url origin $remote
}
