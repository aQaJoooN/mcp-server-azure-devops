param()
$ErrorActionPreference = "Continue"

$BASE = "http://localhost:8888/mcp"
$HDR  = @{
    "Accept"       = "application/json, text/event-stream"
    "Content-Type" = "application/json"
}

function mcp_raw([string]$body) {
    $r = Invoke-WebRequest -Uri $BASE -Method POST -Body $body -Headers $HDR -UseBasicParsing -TimeoutSec 40
    return ($r.Content | ConvertFrom-Json)
}

function call_tool([string]$name, [string]$argsJson = "{}") {
    $body = "{`"jsonrpc`":`"2.0`",`"id`":1,`"method`":`"tools/call`",`"params`":{`"name`":`"$name`",`"arguments`":$argsJson}}"
    $r = mcp_raw $body
    if ($r.error) { return $null, ("ERROR: " + $r.error.message) }
    $text = $r.result.content[0].text
    try   { return ($text | ConvertFrom-Json), $null }
    catch { return $text, $null }
}

function Pass([string]$label, [string]$detail = "") {
    if ($detail) { Write-Host "  PASS  $label -- $detail" -ForegroundColor Green }
    else         { Write-Host "  PASS  $label" -ForegroundColor Green }
}
function Fail([string]$label, [string]$msg) {
    Write-Host "  FAIL  $label -- $msg" -ForegroundColor Red
}
function Skip([string]$label, [string]$msg = "") {
    Write-Host "  SKIP  $label -- $msg" -ForegroundColor Yellow
}

function to_array($data) {
    if ($data -is [array])            { return $data }
    if ($data.runs  -is [array])      { return $data.runs }
    if ($data.value -is [array])      { return $data.value }
    if ($null -ne $data)              { return @($data) }
    return @()
}

Write-Host ""
Write-Host "============================================================"
Write-Host " Azure DevOps MCP Server  -  Full Test Suite"
Write-Host " Server : $BASE"
Write-Host " Project: ECS-agah"
Write-Host "============================================================"
Write-Host ""

# ── 1. list_projects ─────────────────────────────────────────────────────────
Write-Host "[1] list_projects"
$d, $e = call_tool "list_projects"
if ($e) { Fail "list_projects" $e }
else {
    $arr = to_array $d
    Pass "list_projects" "total=$($arr.Count)"
    $arr | Select-Object -First 3 | ForEach-Object { Write-Host "       $($_.name)" }
}

# fix project to ECS-agah always
$PROJECT = "ECS-agah"
Write-Host "    using project: $PROJECT"
Write-Host ""

# ── 2. list_pipelines ────────────────────────────────────────────────────────
Write-Host "[2] list_pipelines"
$aJ = "{`"projectId`":`"$PROJECT`"}"
$d, $e = call_tool "list_pipelines" $aJ
$PIPELINE_ID = 6361
if ($e) { Fail "list_pipelines" $e }
else {
    $arr = to_array $d
    Pass "list_pipelines" "count=$($arr.Count)"
    $arr | Select-Object -First 3 | ForEach-Object { Write-Host "       id=$($_.id)  name=$($_.name)" }
    if ($arr.Count -gt 0) { $PIPELINE_ID = [int]$arr[0].id }
}
Write-Host "    using pipelineId: $PIPELINE_ID"
Write-Host ""

# ── 3. list_repositories ─────────────────────────────────────────────────────
Write-Host "[3] list_repositories"
$aJ = "{`"projectId`":`"$PROJECT`"}"
$d, $e = call_tool "list_repositories" $aJ
$REPO = "agah-proxy"
if ($e) { Fail "list_repositories" $e }
else {
    $arr = to_array $d
    Pass "list_repositories" "count=$($arr.Count)"
    $arr | Select-Object -First 3 | ForEach-Object { Write-Host "       $($_.name)" }
    if ($arr.Count -gt 0) { $REPO = $arr[0].name }
}
Write-Host "    using repo: $REPO"
Write-Host ""

# ── 4. list_environments ─────────────────────────────────────────────────────
Write-Host "[4] list_environments"
$aJ = "{`"projectId`":`"$PROJECT`"}"
$d, $e = call_tool "list_environments" $aJ
if ($e) { Fail "list_environments" $e }
else {
    $arr = to_array $d
    Pass "list_environments" "count=$($arr.Count)"
    $arr | Select-Object -First 3 | ForEach-Object { Write-Host "       $($_.name)" }
}
Write-Host ""

# ── 5. list_libraries ────────────────────────────────────────────────────────
Write-Host "[5] list_libraries"
$aJ = "{`"projectId`":`"$PROJECT`"}"
$d, $e = call_tool "list_libraries" $aJ
if ($e) { Fail "list_libraries" $e }
else {
    $arr = to_array $d
    Pass "list_libraries" "count=$($arr.Count)"
    $arr | Select-Object -First 3 | ForEach-Object { Write-Host "       $($_.name)" }
}
Write-Host ""

# ── 6. list_service_connections ──────────────────────────────────────────────
Write-Host "[6] list_service_connections"
$aJ = "{`"projectId`":`"$PROJECT`"}"
$d, $e = call_tool "list_service_connections" $aJ
if ($e) { Fail "list_service_connections" $e }
else {
    $arr = to_array $d
    Pass "list_service_connections" "count=$($arr.Count)"
    $arr | Select-Object -First 3 | ForEach-Object { Write-Host "       $($_.name)  type=$($_.type)" }
}
Write-Host ""

# ── 7. list_pipeline_runs ────────────────────────────────────────────────────
Write-Host "[7] list_pipeline_runs  (pipelineId=$PIPELINE_ID)"
$aJ = "{`"projectId`":`"$PROJECT`",`"pipelineId`":$PIPELINE_ID}"
$d, $e = call_tool "list_pipeline_runs" $aJ
$RUN_ID = 0
if ($e) { Fail "list_pipeline_runs" $e }
else {
    $runs = if ($d -is [array]) { $d } elseif ($d.runs) { $d.runs } else { @() }
    Pass "list_pipeline_runs" "count=$($runs.Count)"
    $runs | Select-Object -First 3 | ForEach-Object {
        Write-Host "       runId=$($_.id)  state=$($_.state)  result=$($_.result)"
    }
    if ($runs.Count -gt 0) { $RUN_ID = [int]$runs[0].id }
}
Write-Host "    using runId: $RUN_ID"
Write-Host ""

# ── 8. list_commits ──────────────────────────────────────────────────────────
Write-Host "[8] list_commits  (repo=$REPO)"
$aJ = "{`"projectId`":`"$PROJECT`",`"repositoryId`":`"$REPO`",`"branchName`":`"master`",`"top`":5}"
$d, $e = call_tool "list_commits" $aJ
if ($e) {
    $aJ2 = "{`"projectId`":`"$PROJECT`",`"repositoryId`":`"$REPO`",`"branchName`":`"main`",`"top`":5}"
    $d, $e = call_tool "list_commits" $aJ2
}
if ($e) { Fail "list_commits" $e }
else {
    $arr = to_array $d
    Pass "list_commits" "count=$($arr.Count)"
    $arr | Select-Object -First 3 | ForEach-Object { Write-Host "       $($_.commitId)  $($_.comment)" }
}
Write-Host ""

# ── 9. list_branches ─────────────────────────────────────────────────────────
Write-Host "[9] list_branches  (repo=$REPO)"
$aJ = "{`"projectId`":`"$PROJECT`",`"repositoryId`":`"$REPO`"}"
$d, $e = call_tool "list_branches" $aJ
if ($e) { Fail "list_branches" $e }
else {
    $arr = to_array $d
    Pass "list_branches" "count=$($arr.Count)"
    $arr | Select-Object -First 3 | ForEach-Object { Write-Host "       $($_.name)" }
}
Write-Host ""

# ── 10. list_tags ────────────────────────────────────────────────────────────
Write-Host "[10] list_tags  (repo=$REPO)"
$aJ = "{`"projectId`":`"$PROJECT`",`"repositoryId`":`"$REPO`"}"
$d, $e = call_tool "list_tags" $aJ
if ($e) { Fail "list_tags" $e }
else {
    $arr = to_array $d
    Pass "list_tags" "count=$($arr.Count)"
    $arr | Select-Object -First 3 | ForEach-Object { Write-Host "       $($_.name)" }
}
Write-Host ""

# ── 11. list_pull_requests ───────────────────────────────────────────────────
Write-Host "[11] list_pull_requests  (repo=$REPO)"
$aJ = "{`"projectId`":`"$PROJECT`",`"repositoryId`":`"$REPO`",`"status`":`"all`"}"
$d, $e = call_tool "list_pull_requests" $aJ
if ($e) { Fail "list_pull_requests" $e }
else {
    $arr = to_array $d
    Pass "list_pull_requests" "count=$($arr.Count)"
    $arr | Select-Object -First 3 | ForEach-Object {
        Write-Host "       PR#$($_.pullRequestId)  '$($_.title)'"
    }
}
Write-Host ""

# ── Run-specific tests ────────────────────────────────────────────────────────
if ($RUN_ID -le 0) {
    Skip "12-16 (pipeline run tests)" "no run ID available"
} else {

    # 12. pipeline_timeline  (stages)
    Write-Host "[12] pipeline_timeline  (runId=$RUN_ID)"
    $aJ = "{`"projectId`":`"$PROJECT`",`"runId`":$RUN_ID}"
    $d, $e = call_tool "pipeline_timeline" $aJ
    if ($e) { Fail "pipeline_timeline" $e }
    else {
        $recs   = if ($d.records) { $d.records } else { @() }
        $stages = @($recs | Where-Object { $_.type -eq "Stage" })
        Pass "pipeline_timeline" "total_records=$($recs.Count)  stages=$($stages.Count)"
        $stages | Select-Object -First 5 | ForEach-Object {
            Write-Host "       Stage: '$($_.displayName)'  state=$($_.state)  result=$($_.result)"
        }
    }
    Write-Host ""

    # 13. get_pipeline_run_yaml
    Write-Host "[13] get_pipeline_run_yaml  (pipelineId=$PIPELINE_ID runId=$RUN_ID)"
    $aJ = "{`"projectId`":`"$PROJECT`",`"pipelineId`":$PIPELINE_ID,`"runId`":$RUN_ID}"
    $d, $e = call_tool "get_pipeline_run_yaml" $aJ
    if ($e) { Fail "get_pipeline_run_yaml" $e }
    else {
        $yaml = if ($d -is [string]) { $d } else { $d | ConvertTo-Json -Compress }
        $preview = $yaml.Substring(0, [Math]::Min(300, $yaml.Length))
        Pass "get_pipeline_run_yaml" "length=$($yaml.Length) chars"
        Write-Host "       --- preview ---"
        Write-Host "       $preview"
    }
    Write-Host ""

    # 14. get_pipeline_run_sources
    Write-Host "[14] get_pipeline_run_sources  (runId=$RUN_ID)"
    $aJ = "{`"projectId`":`"$PROJECT`",`"runId`":$RUN_ID,`"pipelineId`":$PIPELINE_ID}"
    $d, $e = call_tool "get_pipeline_run_sources" $aJ
    if ($e) { Fail "get_pipeline_run_sources" $e }
    else {
        $resources = if ($d.resources) { $d.resources } else { @() }
        Pass "get_pipeline_run_sources" "resources=$($resources.Count)"
        $resources | ForEach-Object {
            Write-Host "       alias=$($_.alias)  type=$($_.type)  branch=$($_.branch)  commit=$($_.commitId)"
        }
    }
    Write-Host ""

    # 15. get_pipeline_run_stage_tasks
    Write-Host "[15] get_pipeline_run_stage_tasks  (runId=$RUN_ID)"
    $aJ = "{`"projectId`":`"$PROJECT`",`"runId`":$RUN_ID}"
    $stagesData, $e = call_tool "get_pipeline_run_stage_tasks" $aJ
    if ($e) { Fail "get_pipeline_run_stage_tasks" $e; $stagesData = $null }
    else {
        $stageArr = if ($stagesData.stages) { $stagesData.stages } else { @() }
        Pass "get_pipeline_run_stage_tasks" "stages=$($stageArr.Count)"
        foreach ($stg in ($stageArr | Select-Object -First 3)) {
            $jc = if ($stg.jobs) { $stg.jobs.Count } else { 0 }
            Write-Host "       Stage: '$($stg.name)'  state=$($stg.state)  jobs=$jc"
            if ($stg.jobs) {
                foreach ($job in ($stg.jobs | Select-Object -First 2)) {
                    $tc = if ($job.tasks) { $job.tasks.Count } else { 0 }
                    Write-Host "         Job: '$($job.name)'  result=$($job.result)  tasks=$tc"
                    if ($job.tasks) {
                        $job.tasks | Select-Object -First 3 | ForEach-Object {
                            Write-Host "           Task: '$($_.displayName)'  result=$($_.result)  logId=$($_.logId)"
                        }
                    }
                }
            }
        }
    }
    Write-Host ""

    # 16. get_pipeline_log  (find first valid logId from stage tasks)
    Write-Host "[16] get_pipeline_log"
    $firstLogId = 0
    if ($stagesData -and $stagesData.stages) {
        :outer foreach ($stg in $stagesData.stages) {
            if ($stg.jobs) {
                foreach ($job in $stg.jobs) {
                    if ($job.tasks) {
                        foreach ($t in $job.tasks) {
                            if ($t.logId -and [int]$t.logId -gt 0) {
                                $firstLogId = [int]$t.logId
                                break outer
                            }
                        }
                    }
                }
            }
        }
    }
    if ($firstLogId -gt 0) {
        $aJ = "{`"projectId`":`"$PROJECT`",`"runId`":$RUN_ID,`"logId`":$firstLogId}"
        $d, $e = call_tool "get_pipeline_log" $aJ
        if ($e) { Fail "get_pipeline_log (logId=$firstLogId)" $e }
        else {
            $log = if ($d -is [string]) { $d } else { $d | ConvertTo-Json -Compress }
            $preview = $log.Substring(0, [Math]::Min(400, $log.Length))
            Pass "get_pipeline_log" "logId=$firstLogId  length=$($log.Length)"
            Write-Host "       --- log preview ---"
            $preview -split "`n" | Select-Object -First 5 | ForEach-Object { Write-Host "       $_" }
        }
    } else {
        Skip "get_pipeline_log" "no logId found in stage tasks"
    }
    Write-Host ""
}

Write-Host "============================================================"
Write-Host " Tests complete"
Write-Host "============================================================"
