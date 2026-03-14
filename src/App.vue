<template>
  <div class="ink-bg">
    <div class="container">
      <header class="app-header" data-tauri-drag-region>
        <div class="app-brand">
          <InkSeal class="hero-seal" :size="38" :rotate="-8" />
          <div class="app-brand-copy">
            <div class="app-brand-topline">
              <span class="app-brand-kicker">RelayBox for macOS</span>
              <span class="app-brand-mode">{{ modeSummary.stamp }}</span>
            </div>
            <h1 class="hero-title">Clash 配置生成器</h1>
          </div>
        </div>
        <div class="app-header-actions">
          <span class="app-header-status">{{ modeSummary.output }}</span>
          <el-button type="primary" plain size="small" @click="showOnboarding" class="help-btn">
            <el-icon><QuestionFilled /></el-icon>
            使用指南
          </el-button>
        </div>
      </header>
      <div class="app-header-caption">
        {{ form.generateMode === 'subscription' ? '桌面端直接抓订阅、做整理、出 YAML，不再让你在长页面里滚来滚去。' : '订阅、节点、落地和导出都拆进独立工作区，主流程在桌面端横着走，不再纵向修仙。' }}
      </div>

      <InkBamboo position="fixed" :right="-40" :bottom="-50" :opacity="0.9" />

      <Transition name="fade">
        <InkLoading v-if="globalLoading" />
      </Transition>

      <OnboardingWizard
        ref="onboardingRef"
        @complete="onOnboardingComplete"
        @load-demo="loadDemoConfig"
      />

      <div class="layout-flow">
        <!-- 顶部信息条 -->
        <div class="dashboard-strip">
          <div class="dashboard-left">
            <span class="workflow-stamp">{{ modeSummary.stamp }}</span>
            <strong class="dashboard-title">{{ modeSummary.title }}</strong>
          </div>
          <div class="dashboard-center">
            <div v-for="stat in workflowStats" :key="stat.label" class="dashboard-stat-chip">
              <span class="dashboard-stat-label">{{ stat.label }}</span>
              <strong class="dashboard-stat-value">{{ stat.value }}</strong>
            </div>
          </div>
          <div class="dashboard-right">
            <button
              v-for="mode in workbenchModes"
              :key="mode.key"
              type="button"
              class="mode-pill"
              :class="{ 'is-active': currentWorkbenchMode === mode.key }"
              @click="setWorkbenchMode(mode.key)"
            >
              <span class="mode-pill-stamp">{{ mode.stamp }}</span>
              <span class="mode-pill-label">{{ mode.title }}</span>
            </button>
          </div>
        </div>

        <!-- 全宽主工作区 -->
        <main class="layout-main">
          <section class="step-section workspace-tabs-shell">
          <div class="workspace-tab-strip">
            <button
              v-for="tab in workspaceTabs"
              :key="tab.key"
              type="button"
              class="workspace-tab-button"
              :class="{ 'is-active': activeWorkspaceTab === tab.key }"
              @click="activeWorkspaceTab = tab.key"
            >
              <span class="workspace-tab-index">{{ tab.index }}</span>
              <span class="workspace-tab-label">{{ tab.title }}</span>
              <span class="workspace-tab-state" :class="`is-${tab.state}`">{{ tab.stateLabel }}</span>
            </button>
          </div>
        </section>

        <section v-show="activeWorkspaceTab === 'fetch'" :class="['step-section', 'fetch-stage', `state-${getStepState('fetch')}`]">
          <div class="step-header" :class="{ 'is-collapsible': isCompactViewport }" @click="toggleStepPanel('fetch')">
            <span class="step-number">1</span>
            <div class="step-heading">
              <div class="step-heading-top">
                <span class="step-title">获取订阅节点</span>
                <span class="step-state-badge" :class="`is-${getStepState('fetch')}`">{{ getStepStateLabel('fetch') }}</span>
              </div>
              <div class="step-heading-note">{{ stepSummaries.fetch }}</div>
            </div>
            <el-icon v-if="isCompactViewport" class="step-toggle-icon" :class="{ 'is-open': isStepExpanded('fetch') }"><ArrowDown /></el-icon>
          </div>

          <div v-show="isStepExpanded('fetch')" class="step-body">
            <el-form label-position="top">
              <el-form-item label="机场订阅地址">
                <el-autocomplete
                  v-model="form.subscriptionUrl"
                  :fetch-suggestions="querySubscriptionHistory"
                  :trigger-on-focus="true"
                  placeholder="https://example.com/subscription"
                  style="width: 100%;"
                  clearable
                >
                  <template #default="{ item }">
                    <div class="history-item">
                      <span class="history-url">{{ item.value }}</span>
                      <el-button type="danger" link size="small" @click.stop="removeHistoryItem(item.value)">删除</el-button>
                    </div>
                  </template>
                </el-autocomplete>
                <div class="helper-text">点击输入框可查看历史记录；如果订阅站不放 CORS，再去填下方代理地址。</div>
              </el-form-item>

              <div class="fetch-grid">
                <el-form-item v-if="!isDesktopShell" label="本地订阅代理地址（可选）">
                  <el-input v-model="form.proxyUrl" placeholder="http://localhost:8787" />
                  <div class="helper-text">仅用于抓订阅时绕过 CORS，不参与最终 Clash 配置生成。</div>
                </el-form-item>
                <div v-else class="desktop-native-note">
                  <strong>桌面端已内建订阅抓取与测速能力</strong>
                  <span>这里不再需要手填本地代理地址，App 会直接通过原生宿主处理订阅请求和延迟测试。</span>
                </div>

                <div class="fetch-action-card">
                  <span class="fetch-action-kicker">下一步</span>
                  <strong class="fetch-action-title">先把订阅节点拉进来</strong>
                  <span class="fetch-action-desc">后面的模式切换、节点筛选和规则导出都得靠这一步开张。</span>
                  <el-button
                    type="primary"
                    @click="handleFetchWithLoading"
                    :loading="isFetching"
                    :disabled="isFetching"
                    class="fetch-action-button"
                  >
                    {{ isFetching ? "正在获取..." : "获取节点" }}
                  </el-button>
                </div>

                <el-collapse class="paste-collapse">
                  <el-collapse-item name="paste">
                    <template #title>
                      <span class="paste-collapse-title">📋 手动粘贴订阅内容（CORS 失败时用这个）</span>
                    </template>
                    <el-input
                      v-model="manualSubscriptionText"
                      type="textarea"
                      :rows="5"
                      placeholder="把订阅内容粘贴到这里（支持 Base64、YAML、逐行节点链接）"
                    />
                    <el-button
                      type="primary"
                      plain
                      size="small"
                      style="margin-top: 8px;"
                      @click="handleManualPaste"
                      :disabled="!manualSubscriptionText.trim()"
                    >
                      导入粘贴内容
                    </el-button>
                  </el-collapse-item>
                </el-collapse>
              </div>
            </el-form>
          </div>
        </section>

        <section v-show="activeWorkspaceTab === 'nodes'" :class="['step-section', 'nodes-stage', `state-${getStepState('nodes')}`]">
          <div class="step-header" :class="{ 'is-collapsible': isCompactViewport }" @click="toggleStepPanel('nodes')">
            <span class="step-number">2</span>
            <div class="step-heading">
              <div class="step-heading-top">
                <span class="step-title">{{ form.generateMode === 'subscription' ? '查看订阅节点' : '节点工作台' }}</span>
                <span class="step-state-badge" :class="`is-${getStepState('nodes')}`">{{ getStepStateLabel('nodes') }}</span>
              </div>
              <div class="step-heading-note">{{ stepSummaries.nodes }}</div>
            </div>
            <span v-if="nodes.length > 0" class="step-badge">{{ nodes.length }} 个节点</span>
            <el-icon v-if="isCompactViewport" class="step-toggle-icon" :class="{ 'is-open': isStepExpanded('nodes') }"><ArrowDown /></el-icon>
          </div>

          <div v-show="isStepExpanded('nodes')" class="step-body">
            <div class="stage-note-card" :class="`mode-${currentWorkbenchMode}`">
              <span class="stage-note-kicker">{{ modeSummary.shortLabel }}</span>
              <div class="stage-note-title">{{ modeSummary.nodeTitle }}</div>
              <div class="stage-note-desc">{{ modeSummary.nodeDescription }}</div>
            </div>

            <SelectionTray
              v-if="currentWorkbenchMode === 'relay'"
              :selected-nodes="selectedNodes"
              @remove="removeSelectedNode"
              @clear="clearSelection"
            />

            <div v-else class="readonly-note-card">
              <strong>{{ currentWorkbenchMode === 'direct' ? '当前是节点参考台' : '当前是订阅整理台' }}</strong>
              <span>{{ currentWorkbenchMode === 'direct' ? '节点列表只用于搜索、排序、测速和观察质量，不参与跳板选择。' : '所有订阅节点默认参与导出，这里主要负责筛选、分组和测速。' }}</span>
            </div>

            <div class="selector-toolbar">
              <div class="selector-toolbar-filters">
                <el-input
                  v-model="nodeSearch"
                  placeholder="搜索节点..."
                  :prefix-icon="Search"
                  clearable
                  style="width: 200px;"
                />
                <el-select v-model="nodeSortBy" placeholder="排序" style="width: 120px;">
                  <el-option label="默认" value="default" />
                  <el-option label="延迟" value="latency" />
                  <el-option label="名称" value="name" />
                  <el-option label="类型" value="type" />
                </el-select>
                <el-button size="small" @click="testAllNodesLatency" :loading="isTesting" :disabled="nodes.length === 0">
                  测速
                </el-button>
              </div>

              <div v-if="currentWorkbenchMode === 'relay'" class="selector-toolbar-actions">
                <span class="selection-count">已选 {{ selectedNodes.length }} 个跳板</span>
                <el-button-group size="small">
                  <el-button @click="selectAllNodes" :disabled="displayNodes.length === 0">全选</el-button>
                  <el-button @click="invertSelection" :disabled="displayNodes.length === 0">反选</el-button>
                  <el-button @click="clearSelection" :disabled="form.dialerProxyGroup.length === 0">清空</el-button>
                </el-button-group>
              </div>
            </div>

            <el-tabs v-model="activeNodeGroup" type="card" class="node-tabs">
              <el-tab-pane label="全部" name="all">
                <template #label>全部 ({{ filteredNodes.length }})</template>
              </el-tab-pane>
              <el-tab-pane v-for="group in nodeGroups" :key="group.key" :name="group.key">
                <template #label>{{ group.label }} ({{ group.count }})</template>
              </el-tab-pane>
            </el-tabs>

            <div class="node-table-shell" :class="{ 'is-readonly': isNodeSelectionDisabled }">
              <div v-if="isNodeSelectionDisabled" class="node-table-overlay">
                <div class="node-table-overlay-text">{{ currentWorkbenchMode === 'subscription' ? '订阅整理模式' : '直连参考面板' }}</div>
              </div>
              <el-table
                :data="displayNodes"
                size="small"
                height="400"
                empty-text="暂无节点，请先获取订阅"
                style="width: 100%"
                @row-click="currentWorkbenchMode === 'relay' ? handleNodeRowClick($event) : undefined"
                highlight-current-row
                :row-class-name="getRowClassName"
              >
                <el-table-column label="节点名称" min-width="260" show-overflow-tooltip>
                  <template #default="{ row }">
                    <span class="node-name">
                      <span v-if="currentWorkbenchMode === 'relay'" class="node-marker" :class="{ active: form.dialerProxyGroup.includes(row.name) }"></span>
                      {{ row.name }}
                    </span>
                  </template>
                </el-table-column>
                <el-table-column prop="type" label="类型" width="90" />
                <el-table-column label="延迟" width="90">
                  <template #default="{ row }">
                    <span v-if="row.latency === -1" style="color: #999;">—</span>
                    <span v-else-if="row.latency === -2" style="color: #f56c6c;">失败</span>
                    <span v-else-if="row.latency" :style="{ color: getLatencyColor(row.latency) }">
                      {{ row.latency }}ms
                    </span>
                    <el-icon v-else class="is-loading" style="color: #409eff;"><Loading /></el-icon>
                  </template>
                </el-table-column>
                <el-table-column prop="server" label="服务器" min-width="160" show-overflow-tooltip />
              </el-table>
            </div>

            <div v-if="selectedNodes.length > 1 && currentWorkbenchMode === 'relay'" class="strategy-config">
              <div class="strategy-config-header">
                <div>
                  <div class="config-label">多跳板策略组</div>
                  <div class="helper-text">跳板超过一个时，再决定是自动选、手动切还是故障转移。</div>
                </div>
                <span class="strategy-count-tag">{{ selectedNodes.length }} 个跳板</span>
              </div>
              <el-radio-group v-model="form.dialerProxyType" size="small">
                <el-radio-button value="url-test">自动选择</el-radio-button>
                <el-radio-button value="select">手动选择</el-radio-button>
                <el-radio-button value="fallback">故障转移</el-radio-button>
              </el-radio-group>

              <div
                v-if="form.dialerProxyType === 'url-test' || form.dialerProxyType === 'fallback'"
                class="strategy-tuning"
              >
                <div class="tuning-item">
                  <span>检测间隔</span>
                  <el-input-number v-model="form.urlTestInterval" :min="10" :max="600" :step="10" />
                  <span>秒</span>
                </div>
                <div class="tuning-item">
                  <span>延迟容差</span>
                  <el-input-number v-model="form.urlTestTolerance" :min="0" :max="500" :step="10" />
                  <span>ms</span>
                </div>
                <el-switch
                  v-model="form.urlTestLazy"
                  :active-value="false"
                  :inactive-value="true"
                  active-text="立即测试"
                  inactive-text="懒加载"
                />
              </div>
            </div>
          </div>
        </section>

        <section v-if="form.generateMode !== 'subscription' && activeWorkspaceTab === 'landing'" :class="['step-section', 'landing-stage', `state-${getStepState('landing')}`]">
          <div class="step-header" :class="{ 'is-collapsible': isCompactViewport }" @click="toggleStepPanel('landing')">
            <span class="step-number">3</span>
            <div class="step-heading">
              <div class="step-heading-top">
                <span class="step-title">配置落地节点</span>
                <span class="step-state-badge" :class="`is-${getStepState('landing')}`">{{ getStepStateLabel('landing') }}</span>
              </div>
              <div class="step-heading-note">{{ stepSummaries.landing }}</div>
            </div>
            <el-icon v-if="isCompactViewport" class="step-toggle-icon" :class="{ 'is-open': isStepExpanded('landing') }"><ArrowDown /></el-icon>
          </div>

          <div v-show="isStepExpanded('landing')" class="step-body">
            <el-form label-position="top">
              <el-form-item label="快速解析节点链接">
                <div class="landing-url-row">
                  <el-input
                    v-model="form.landingNodeUrl"
                    placeholder="socks5:// ss:// vmess:// vless:// trojan:// hysteria2:// tuic://"
                  />
                  <el-button type="primary" @click="parseLandingNodeUrl">解析</el-button>
                </div>
                <div class="helper-text">复杂协议只认这条入口，别硬拿半截参数手搓，搓出来也是残废配置。</div>
              </el-form-item>

              <div class="form-grid">
                <el-form-item label="节点类型">
                  <el-select v-model="form.landingNodeType" style="width: 100%;">
                    <el-option
                      v-for="option in landingTypeOptions"
                      :key="option.value"
                      :label="option.label"
                      :value="option.value"
                    />
                  </el-select>
                </el-form-item>
                <el-form-item label="别名">
                  <el-input v-model="form.socksAlias" placeholder="落地节点" />
                </el-form-item>
                <el-form-item label="服务器地址">
                  <el-input v-model="form.socksServer" placeholder="1.2.3.4" :disabled="requiresParsedLandingNode" />
                </el-form-item>
                <el-form-item label="端口">
                  <el-input v-model="form.socksPort" placeholder="1080" :disabled="requiresParsedLandingNode" />
                </el-form-item>
                <el-form-item label="用户名（可选）">
                  <el-input v-model="form.socksUser" placeholder="" :disabled="requiresParsedLandingNode" />
                </el-form-item>
                <el-form-item label="密码（可选）">
                  <el-input v-model="form.socksPass" placeholder="" show-password :disabled="requiresParsedLandingNode" />
                </el-form-item>
              </div>

              <el-alert
                v-if="requiresParsedLandingNode"
                :title="parsedLandingMatchesType ? `已载入 ${form.landingNodeType.toUpperCase()} 节点，生成时会直接使用解析出的完整参数。` : `当前协议 ${form.landingNodeType.toUpperCase()} 仅支持通过链接解析导入。`"
                :type="parsedLandingMatchesType ? 'success' : 'warning'"
                :closable="false"
                style="margin-bottom: 8px;"
              />

              <el-alert
                v-if="status.message"
                :title="status.message"
                :type="status.type"
                show-icon
                :closable="false"
              />
            </el-form>
          </div>
        </section>

        <section v-if="form.generateMode === 'subscription' && activeWorkspaceTab === 'landing'" :class="['step-section', 'subscription-info-card', 'landing-stage', `state-${getStepState('landing')}`]">
          <div class="step-header" :class="{ 'is-collapsible': isCompactViewport }" @click="toggleStepPanel('landing')">
            <span class="step-number">3</span>
            <div class="step-heading">
              <div class="step-heading-top">
                <span class="step-title">落地节点（已跳过）</span>
                <span class="step-state-badge" :class="`is-${getStepState('landing')}`">{{ getStepStateLabel('landing') }}</span>
              </div>
              <div class="step-heading-note">{{ stepSummaries.landing }}</div>
            </div>
            <el-icon v-if="isCompactViewport" class="step-toggle-icon" :class="{ 'is-open': isStepExpanded('landing') }"><ArrowDown /></el-icon>
          </div>
          <div v-show="isStepExpanded('landing')" class="step-body">
            <div class="subscription-skip-hint">
              <el-icon class="subscription-skip-icon"><InfoFilled /></el-icon>
              <div>
                <div class="subscription-skip-title">订阅整理模式无需配置落地节点</div>
                <div class="subscription-skip-desc">所有订阅节点将直接规范化输出，不会生成 dialer-proxy 和落地节点策略组。</div>
              </div>
            </div>
          </div>
        </section>

        <section v-show="activeWorkspaceTab === 'rules'" :class="['step-section', 'rules-stage', `state-${getStepState('rules')}`]">
          <div class="step-header" :class="{ 'is-collapsible': isCompactViewport }" @click="toggleStepPanel('rules')">
            <span class="step-number">4</span>
            <div class="step-heading">
              <div class="step-heading-top">
                <span class="step-title">规则与导出</span>
                <span class="step-state-badge" :class="`is-${getStepState('rules')}`">{{ getStepStateLabel('rules') }}</span>
              </div>
              <div class="step-heading-note">{{ stepSummaries.rules }}</div>
            </div>
            <el-icon v-if="isCompactViewport" class="step-toggle-icon" :class="{ 'is-open': isStepExpanded('rules') }"><ArrowDown /></el-icon>
          </div>

          <div v-show="isStepExpanded('rules')" class="step-body">
            <div class="desktop-output-toolbar">
              <div class="desktop-output-summary">
                <span class="sticky-action-kicker">{{ modeSummary.stamp }}</span>
                <strong class="desktop-output-title">{{ stickyActionSummary.title }}</strong>
                <span class="desktop-output-note">{{ stickyActionSummary.note }}</span>
              </div>
              <div class="desktop-output-actions">
                <span class="sticky-state-pill" :class="{ 'is-ready': readyToGenerate, 'is-blocked': !readyToGenerate }">
                  {{ readyToGenerate ? "可以生成" : "还有前置条件" }}
                </span>
                <el-button v-if="lastSavedPath" size="small" @click="revealSavedYaml">定位文件</el-button>
                <el-button v-if="yamlText" size="small" @click="copyYaml">复制</el-button>
                <el-button v-if="yamlText" size="small" @click="downloadYaml">{{ saveActionLabel }}</el-button>
                <el-button
                  type="primary"
                  size="large"
                  @click="handleGenerate"
                  :disabled="!readyToGenerate"
                >
                  {{ form.generateMode === 'subscription' ? '生成订阅配置' : '生成 Clash 配置' }}
                </el-button>
              </div>
            </div>

            <div class="output-tab-strip">
              <button
                type="button"
                class="output-tab-button"
                :class="{ 'is-active': activeOutputTab === 'rules' }"
                @click="activeOutputTab = 'rules'"
              >
                规则
              </button>
              <button
                type="button"
                class="output-tab-button"
                :class="{ 'is-active': activeOutputTab === 'preview' }"
                @click="activeOutputTab = 'preview'"
              >
                预览
              </button>
            </div>

            <div v-show="activeOutputTab === 'rules'" class="rule-card">
              <div class="rule-card-header">
                <div>
                  <div class="config-label">自定义规则（可选）</div>
                  <div class="helper-text">常用规则优先点片段，不够再手写；别一上来就跟 YAML 硬掰手腕。</div>
                </div>
                <div class="rule-card-actions">
                  <el-button text @click="showAdvancedRuleEditor = !showAdvancedRuleEditor">
                    {{ showAdvancedRuleEditor || !isCompactViewport ? "收起手写区" : "展开手写区" }}
                  </el-button>
                  <el-button text @click="clearCustomRules" :disabled="!form.customRulesText.trim()">清空自定义规则</el-button>
                </div>
              </div>

              <div class="rule-workbench">
                <div class="rule-builder-panel">
                  <div class="rule-builder-row">
                    <el-select v-model="ruleDraft.type" placeholder="规则类型">
                      <el-option
                        v-for="option in ruleTypeOptions"
                        :key="option.value"
                        :label="option.label"
                        :value="option.value"
                      />
                    </el-select>
                    <el-select v-model="ruleDraft.policy" placeholder="策略">
                      <el-option
                        v-for="option in rulePolicyOptions"
                        :key="option.value"
                        :label="option.label"
                        :value="option.value"
                      />
                    </el-select>
                  </div>

                  <div class="rule-builder-row">
                    <el-input
                      v-model="ruleDraft.value"
                      :placeholder="ruleDraftPlaceholder"
                      @keyup.enter="appendRuleFromDraft"
                    />
                    <el-button type="primary" @click="appendRuleFromDraft">添加规则</el-button>
                  </div>

                  <div class="rule-snippets">
                    <div v-for="group in quickRuleSnippetGroups" :key="group.title" class="rule-snippet-group">
                      <span class="rule-snippets-label">{{ group.title }}</span>
                      <div class="rule-snippet-list">
                        <button
                          v-for="snippet in group.items"
                          :key="snippet.label"
                          type="button"
                          class="rule-snippet-chip"
                          @click="appendRuleSnippet(snippet)"
                        >
                          {{ snippet.label }}
                        </button>
                      </div>
                    </div>
                  </div>

                  <div v-if="customRuleEntries.length > 0" class="rule-lines-board">
                    <div class="rule-lines-header">
                      <span>已添加 {{ customRuleEntries.length }} 条</span>
                      <span>规则先排在默认规则前面，命中优先级更高。</span>
                    </div>
                    <div class="rule-lines-list">
                      <div v-for="entry in customRuleEntries" :key="`${entry.line}-${entry.index}`" class="rule-line-item">
                        <div class="rule-line-main">
                          <div class="rule-line-meta">
                            <span class="rule-mini-chip">{{ entry.type }}</span>
                            <span class="rule-mini-chip is-policy">{{ entry.policy }}</span>
                          </div>
                          <code class="rule-line-code">{{ entry.line }}</code>
                        </div>
                        <el-button text type="danger" @click="removeCustomRuleLine(entry.index)">删除</el-button>
                      </div>
                    </div>
                  </div>
                </div>

                <div v-show="showAdvancedRuleEditor || !isCompactViewport" class="rule-editor-panel">
                  <div v-if="ruleValidationState.issues.length" class="rule-validation-card is-error">
                    <div class="rule-validation-title">手写规则里有 {{ ruleValidationState.issues.length }} 处格式要处理</div>
                    <div
                      v-for="issue in ruleValidationState.issues.slice(0, 4)"
                      :key="`${issue.line}-${issue.message}`"
                      class="rule-validation-item"
                    >
                      第 {{ issue.line }} 行：{{ issue.message }}
                    </div>
                  </div>
                  <div v-else-if="customRuleEntries.length > 0" class="rule-validation-card is-ok">
                    手写规则格式检查通过，当前可以直接生成。
                  </div>

                  <el-input
                    v-model="form.customRulesText"
                    type="textarea"
                    :rows="11"
                    placeholder="每行一条 Clash 规则，例如：DOMAIN-SUFFIX,example.com,DIRECT"
                  />
                  <div class="helper-text">
                    内置默认规则始终启用；这里写的规则会排在默认规则前面，优先级更高。
                  </div>
                </div>
              </div>
            </div>

            <div v-show="activeOutputTab === 'rules'" class="format-tip">
              <el-icon><InfoFilled /></el-icon>
              <span>当前只生成 Clash YAML，支持 Clash Verge、OpenClash、Shadowrocket 等客户端导入。</span>
            </div>

            <div v-if="activeOutputTab === 'preview' && yamlText" class="yaml-section">
              <div class="yaml-header">
                <div class="yaml-heading">
                  <span class="yaml-title">Clash 配置预览</span>
                  <span class="yaml-note">先预览，再复制或下载，省得把半成品扔给客户端。</span>
                </div>
                <div class="yaml-actions">
                  <el-button size="small" @click="copyYaml">复制</el-button>
                  <el-button size="small" type="primary" @click="downloadYaml">{{ saveActionLabel }}</el-button>
                </div>
              </div>
              <pre class="config-preview" v-html="highlightedYaml"></pre>
            </div>

            <div v-else-if="activeOutputTab === 'preview'" class="empty-preview-card">
              <strong>还没有可预览的 Clash YAML</strong>
              <span>先把订阅、链路和规则准备好，再点一次生成。生成后我会把你自动切到这里。</span>
            </div>
          </div>
        </section>
        </main>
      </div>

      <div class="footer">
        Clash 配置生成器 ·
        <a href="https://github.com/Gary-zy/ClashRelay" target="_blank">GitHub</a>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, defineAsyncComponent, reactive, ref, watch, onBeforeUnmount, onMounted } from "vue";
import { ElMessage } from "element-plus";
import { QuestionFilled, Search, Loading, InfoFilled, ArrowDown } from "@element-plus/icons-vue";
import SelectionTray from "./components/SelectionTray.vue";
import InkSeal from "./components/decorations/InkSeal.vue";
import InkBamboo from "./components/decorations/InkBamboo.vue";
import InkLoading from "./components/InkLoading.vue";
import { useNodes } from "./composables/useNodes.js";
import { useSubscription } from "./composables/useSubscription.js";
import { useConfig, MANUAL_LANDING_TYPES } from "./composables/useConfig.js";
import { highlightYaml } from "./utils/helpers.js";
import { desktopApi, isDesktopApp } from "./utils/desktop.js";

const OnboardingWizard = defineAsyncComponent(() => import("./components/OnboardingWizard.vue"));

const STORAGE_KEY = "clashrelay_config";
const DESKTOP_STATE_VERSION = 1;
const LEGACY_STORAGE_KEYS = ["clashrelay_favorites", "clashrelay_health", "clashrelay_template", "clashrelay_rules"];
const landingTypeOptions = [
  { label: "SOCKS5", value: "socks5" },
  { label: "HTTP", value: "http" },
  { label: "AnyTLS", value: "anytls" },
  { label: "Shadowsocks", value: "ss" },
  { label: "ShadowsocksR", value: "ssr" },
  { label: "VMess", value: "vmess" },
  { label: "VLESS", value: "vless" },
  { label: "Trojan", value: "trojan" },
  { label: "Hysteria", value: "hysteria" },
  { label: "Hysteria2", value: "hysteria2" },
  { label: "TUIC", value: "tuic" },
];
const ruleTypeOptions = [
  { label: "域名后缀", value: "DOMAIN-SUFFIX" },
  { label: "域名关键字", value: "DOMAIN-KEYWORD" },
  { label: "完整域名", value: "DOMAIN" },
  { label: "IP 段", value: "IP-CIDR" },
  { label: "进程名", value: "PROCESS-NAME" },
];
const persistedKeys = [
  "subscriptionUrl",
  "proxyUrl",
  "landingNodeUrl",
  "landingNodeType",
  "socksServer",
  "socksPort",
  "socksUser",
  "socksPass",
  "socksAlias",
  "dialerProxyGroup",
  "dialerProxyType",
  "urlTestInterval",
  "urlTestTolerance",
  "urlTestLazy",
  "customRulesText",
  "isDirect",
  "generateMode",
];
const desktopPersistedKeys = persistedKeys.filter((key) => key !== "proxyUrl");
const isDesktopShell = isDesktopApp();

const globalLoading = ref(false);
const isCompactViewport = ref(false);
const onboardingRef = ref(null);
const showAdvancedRuleEditor = ref(true);
const lastSavedPath = ref("");
const activeWorkspaceTab = ref("fetch");
const activeOutputTab = ref("rules");
const expandedSteps = reactive({
  fetch: true,
  nodes: true,
  landing: false,
  rules: false,
});
const ruleDraft = reactive({
  type: "DOMAIN-SUFFIX",
  value: "",
  policy: "",
});

let saveConfigTimer = null;

const loadSavedConfig = () => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return null;
    const parsed = JSON.parse(saved);
    const result = persistedKeys.reduce((acc, key) => {
      if (key in parsed) acc[key] = parsed[key];
      return acc;
    }, {});
    // 生产环境下清除残留的 localhost 代理地址
    if (!import.meta.env.DEV && result.proxyUrl && /localhost|127\.0\.0\.1/i.test(result.proxyUrl)) {
      result.proxyUrl = "";
    }
    return result;
  } catch {
    return null;
  }
};

const createDesktopStatePayload = () => ({
  version: DESKTOP_STATE_VERSION,
  form: desktopPersistedKeys.reduce((acc, key) => {
    acc[key] = Array.isArray(form[key]) ? [...form[key]] : form[key];
    return acc;
  }, {}),
  lastSavedPath: lastSavedPath.value || "",
});

const clearLegacyStorage = () => {
  LEGACY_STORAGE_KEYS.forEach((key) => {
    try {
      localStorage.removeItem(key);
    } catch {}
  });
};

const formDefaults = {
  subscriptionUrl: "",
  proxyUrl: import.meta.env.DEV ? "http://localhost:8787" : "",
  landingNodeUrl: "",
  landingNodeType: "socks5",
  socksServer: "",
  socksPort: "",
  socksUser: "",
  socksPass: "",
  socksAlias: "落地节点",
  dialerProxyGroup: [],
  dialerProxyType: "url-test",
  urlTestInterval: 30,
  urlTestTolerance: 50,
  urlTestLazy: false,
  customRulesText: "",
  isDirect: false,
  generateMode: "relay",
};

const form = reactive({ ...formDefaults });
const status = reactive({ message: "", type: "info" });
const yamlText = ref("");
const previousYaml = ref("");
const saveActionLabel = computed(() => (isDesktopShell ? "保存" : "下载"));

const {
  nodes,
  nodeSearch,
  nodeSortBy,
  activeNodeGroup,
  nodeGroups,
  filteredNodes,
  displayNodes,
  isTesting,
  getLatencyColor,
  handleNodeRowClick,
  selectAllNodes,
  invertSelection,
  clearSelection,
  testAllNodesLatency,
} = useNodes({ form, status });

const saveConfig = () => {
  try {
    const payload = persistedKeys.reduce((acc, key) => {
      acc[key] = Array.isArray(form[key]) ? [...form[key]] : form[key];
      return acc;
    }, {});
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch {}

  if (!isDesktopShell) return;
  if (saveConfigTimer) window.clearTimeout(saveConfigTimer);
  saveConfigTimer = window.setTimeout(() => {
    desktopApi.saveState(createDesktopStatePayload()).catch(() => {});
  }, 200);
};

const {
  isFetching,
  querySubscriptionHistory,
  removeHistoryItem,
  handleFetch,
  parseSubscription,
} = useSubscription({
  form,
  nodes,
  status,
  saveConfig,
});

// 手动粘贴订阅内容（CORS 失败时的回退方案）
const manualSubscriptionText = ref("");
const handleManualPaste = () => {
  const text = manualSubscriptionText.value.trim();
  if (!text) return;
  const parsed = parseSubscription(text);
  if (!parsed.length) {
    status.message = "粘贴的内容没有解析出节点，请检查格式。";
    status.type = "error";
    return;
  }
  // 去重节点名
  const nameCounts = new Map();
  parsed.forEach((node) => {
    let name = node.name;
    if (nameCounts.has(name)) {
      const count = nameCounts.get(name) + 1;
      nameCounts.set(name, count);
      node.name = `${name} (${count - 1})`;
    } else {
      nameCounts.set(name, 1);
    }
  });
  nodes.value = parsed;
  nodes.value.forEach((n) => { n.latency = -1; });
  // 裁剪 dialerProxyGroup：移除新节点列表中已不存在的悬空名
  const newNames = new Set(parsed.map((n) => n.name));
  form.dialerProxyGroup = form.dialerProxyGroup.filter((name) => newNames.has(name));
  if (saveConfig) saveConfig();
  manualSubscriptionText.value = "";
  status.message = `成功从粘贴内容解析 ${parsed.length} 个节点。`;
  status.type = "success";
};

const {
  landingNode,
  selectedNodes,
  requiresParsedLandingNode,
  parseLandingNodeUrl,
  generateYaml,
} = useConfig({
  form,
  nodes,
  status,
  yamlText,
  previousYaml,
});

const highlightedYaml = computed(() => highlightYaml(yamlText.value));
const currentWorkbenchMode = computed(() => {
  if (form.generateMode === "subscription") return "subscription";
  return form.isDirect ? "direct" : "relay";
});
const isNodeSelectionDisabled = computed(() => currentWorkbenchMode.value !== "relay");
const parsedLandingMatchesType = computed(
  () => Boolean(landingNode.value && landingNode.value.type === form.landingNodeType)
);
const landingPolicyName = computed(() => `🎯 ${form.socksAlias?.trim() || "落地节点"}`);
const workbenchModes = computed(() => [
  {
    key: "relay",
    title: "落地节点模式",
    stamp: "链路",
    output: "跳板 + 落地",
    description: "订阅节点先做跳板，再挂到落地节点后面，适合专线分流和稳定出口。",
    footnote: "会生成完整中转链路和落地策略组。",
  },
  {
    key: "direct",
    title: "直连模式",
    stamp: "直出",
    output: "落地直连",
    description: "节点列表只做参考和测速，生成时不注入跳板，直接输出落地节点配置。",
    footnote: "适合你已经确认落地节点参数完整的场景。",
  },
  {
    key: "subscription",
    title: "订阅整理模式",
    stamp: "整理",
    output: "纯订阅导出",
    description: "不再配置落地节点，只把订阅节点、规则和策略组规范化输出。",
    footnote: "适合给 Clash Verge 做干净订阅整理。",
  },
]);
const modeSummary = computed(() => {
  const summaryMap = {
    relay: {
      title: "落地节点模式",
      stamp: "朱印 · 链路",
      shortLabel: "中转工作台",
      description: "先挑跳板，再配落地节点，最后生成一份带清晰分流的 Clash YAML。现在页面的主路径是明确的，不用再在一堆配置里瞎翻。",
      nodeTitle: "这里是跳板选择台",
      nodeDescription: "搜索、排序、测速之后，把真正要挂到落地节点前面的跳板挑出来。",
      output: "Clash YAML",
    },
    direct: {
      title: "直连模式",
      stamp: "朱印 · 直出",
      shortLabel: "直连工作台",
      description: "保留订阅节点的浏览和测速，但不参与跳板选择，最终只生成落地节点直连配置。",
      nodeTitle: "这里是节点参考台",
      nodeDescription: "节点表格不参与选择，只负责帮你看订阅质量、延迟和分组情况。",
      output: "直连 Clash YAML",
    },
    subscription: {
      title: "订阅整理模式",
      stamp: "朱印 · 归整",
      shortLabel: "整理工作台",
      description: "不配置落地节点，直接把订阅节点整理成 Clash Verge 可用配置，逻辑更干净，步骤也更短。",
      nodeTitle: "这里是订阅节点册",
      nodeDescription: "所有订阅节点默认参与导出，这里主要负责筛选、排序和测速。",
      output: "订阅整理 YAML",
    },
  };
  return summaryMap[currentWorkbenchMode.value];
});
const rulePolicyOptions = computed(() => {
  if (form.generateMode === 'subscription') {
    return [
      { label: "代理出口 (🌐 代理出口)", value: "🌐 代理出口" },
      { label: "直连 (DIRECT)", value: "DIRECT" },
      { label: "自动选择 (♻️ 自动选择)", value: "♻️ 自动选择" },
    ];
  }
  return [
    { label: `落地节点 (${landingPolicyName.value})`, value: landingPolicyName.value },
    { label: "代理出口 (🌐 代理出口)", value: "🌐 代理出口" },
    { label: "直连 (DIRECT)", value: "DIRECT" },
  ];
});
const splitRuleByTopLevelCommas = (line) => {
  const parts = [];
  let depth = 0;
  let start = 0;

  for (let i = 0; i < line.length; i++) {
    if (line[i] === "(") depth++;
    else if (line[i] === ")" && depth > 0) depth--;
    else if (line[i] === "," && depth === 0) {
      parts.push(line.slice(start, i));
      start = i + 1;
    }
  }

  parts.push(line.slice(start));
  return parts;
};
const customRuleLines = computed(() =>
  form.customRulesText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("#") && !line.startsWith("//"))
);
const customRuleEntries = computed(() =>
  customRuleLines.value.map((line, index) => {
    const parts = splitRuleByTopLevelCommas(line);
    const type = parts[0]?.trim() || "RULE";
    const policy = (type === "MATCH" ? parts[1] : parts[2])?.trim() || "未识别";
    return {
      index,
      line,
      type,
      policy,
    };
  })
);
const quickRuleSnippetGroups = computed(() => {
  if (form.generateMode === 'subscription') {
    return [
      {
        title: "开发社区",
        items: [
          {
            label: "GitHub 走代理出口",
            lines: ["DOMAIN-SUFFIX,github.com,🌐 代理出口"],
          },
          {
            label: "Linux.do 走代理出口",
            lines: ["DOMAIN-SUFFIX,linux.do,🌐 代理出口"],
          },
          {
            label: "Linux.do + API",
            lines: [
              "DOMAIN-SUFFIX,linux.do,🌐 代理出口",
              "DOMAIN,connect.linux.do,🌐 代理出口",
            ],
          },
        ],
      },
      {
        title: "网络与直连",
        items: [
          {
            label: "局域网直连",
            lines: ["IP-CIDR,192.168.0.0/16,DIRECT"],
          },
        ],
      },
    ];
  }
  return [
    {
      title: "AI 专线",
      items: [
        {
          label: "OpenAI 走落地",
          lines: [`DOMAIN-SUFFIX,openai.com,${landingPolicyName.value}`],
        },
        {
          label: "Claude 走落地",
          lines: [`DOMAIN-SUFFIX,claude.ai,${landingPolicyName.value}`],
        },
      ],
    },
    {
      title: "开发社区",
      items: [
        {
          label: "GitHub 走代理出口",
          lines: ["DOMAIN-SUFFIX,github.com,🌐 代理出口"],
        },
        {
          label: "Linux.do 走代理出口",
          lines: ["DOMAIN-SUFFIX,linux.do,🌐 代理出口"],
        },
        {
          label: "Linux.do + API",
          lines: [
            "DOMAIN-SUFFIX,linux.do,🌐 代理出口",
            "DOMAIN,connect.linux.do,🌐 代理出口",
          ],
        },
      ],
    },
    {
      title: "网络与直连",
      items: [
        {
          label: "局域网直连",
          lines: ["IP-CIDR,192.168.0.0/16,DIRECT"],
        },
      ],
    },
  ];
});
const ruleDraftPlaceholder = computed(() => {
  const placeholderMap = {
    "DOMAIN-SUFFIX": "例如 example.com",
    "DOMAIN-KEYWORD": "例如 openai",
    DOMAIN: "例如 chat.openai.com",
    "IP-CIDR": "例如 10.0.0.0/8",
    "PROCESS-NAME": "例如 WeChat.exe",
  };
  return placeholderMap[ruleDraft.type] || "填写规则值";
});
const ruleValidationState = computed(() => {
  const issues = [];

  customRuleLines.value.forEach((line, index) => {
    const parts = splitRuleByTopLevelCommas(line);
    const type = parts[0]?.trim();

    if (!type) {
      issues.push({ line: index + 1, message: "规则类型为空。" });
      return;
    }

    if (type === "MATCH") {
      if (parts.length < 2 || !parts[1]?.trim()) {
        issues.push({ line: index + 1, message: "MATCH 规则至少要有策略字段。" });
      }
      return;
    }

    if (parts.length < 3) {
      issues.push({ line: index + 1, message: "规则至少需要 类型、匹配值、策略 三段。" });
      return;
    }

    if (!parts[1]?.trim()) {
      issues.push({ line: index + 1, message: "匹配值为空。" });
    }

    if (!parts[2]?.trim()) {
      issues.push({ line: index + 1, message: "策略字段为空。" });
    }
  });

  return {
    valid: issues.length === 0,
    issues,
  };
});
const isFetchReady = computed(() => currentWorkbenchMode.value === "direct" || nodes.value.length > 0);
const isNodeStepReady = computed(() => {
  if (currentWorkbenchMode.value === "relay") {
    return selectedNodes.value.length > 0;
  }
  if (currentWorkbenchMode.value === "direct") {
    return true;
  }
  return nodes.value.length > 0;
});
const isLandingStepReady = computed(() => {
  if (form.generateMode === "subscription") return true;
  if (requiresParsedLandingNode.value) return parsedLandingMatchesType.value;
  return Boolean(form.socksAlias.trim() && form.socksServer.trim() && form.socksPort.trim());
});
const readyToGenerate = computed(() => {
  const workflowReady = form.generateMode === "subscription"
    ? isFetchReady.value
    : isLandingStepReady.value && (form.isDirect || selectedNodes.value.length > 0);
  return workflowReady && ruleValidationState.value.valid;
});
const stepSummaries = computed(() => ({
  fetch: currentWorkbenchMode.value === "direct"
    ? "直连模式下订阅节点这一步是可选参考项，不拉也能直接生成落地配置。"
    : isFetchReady.value
    ? `已抓取 ${nodes.value.length} 个订阅节点，可以往下配工作台了。`
    : "先把订阅节点拉进来，后面的筛选、跳板和导出才有东西可用。",
  nodes: currentWorkbenchMode.value === "relay"
    ? (selectedNodes.value.length > 0 ? `已选 ${selectedNodes.value.length} 个跳板节点，链路可以继续往下走。` : "这里决定跳板链路，至少挑一个节点才算进入中转工作流。")
    : currentWorkbenchMode.value === "direct"
      ? "这里是直连参考台，节点只看质量，不参与选择。"
      : "这里负责订阅整理，节点默认全部参与导出。",
  landing: form.generateMode === "subscription"
    ? "订阅整理模式没有落地节点步骤，这里直接跳过。"
    : isLandingStepReady.value
      ? `${form.landingNodeType.toUpperCase()} 落地节点已就绪，可以直接生成。`
      : "补齐落地节点别名、地址和端口，复杂协议记得先走链接解析。",
  rules: yamlText.value
    ? "配置已经生成，可以继续预览、复制或下载。"
    : ruleValidationState.value.issues.length
      ? `手写规则里还有 ${ruleValidationState.value.issues.length} 处格式要处理。`
      : "规则确认后就能直接生成 Clash YAML。",
}));
const stepStateMap = computed(() => ({
  fetch: isFetchReady.value,
  nodes: isNodeStepReady.value,
  landing: isLandingStepReady.value,
  rules: Boolean(yamlText.value),
}));
const activeStep = computed(() => {
  const order = ["fetch", "nodes", "landing", "rules"];
  return order.find((key) => !stepStateMap.value[key]) || "rules";
});
const completedStepCount = computed(() => Object.values(stepStateMap.value).filter(Boolean).length);
const workflowStats = computed(() => [
  {
    label: "进度",
    value: `${completedStepCount.value} / 4`,
    note: yamlText.value ? "当前流程已经出 YAML 了。" : "还没走完的步骤会继续高亮。",
  },
  {
    label: "下一步",
    value: stepStateMap.value[activeStep.value] ? "检查输出" : ({
      fetch: "拉取订阅",
      nodes: currentWorkbenchMode.value === "relay" ? "选择跳板" : "筛选节点",
      landing: "配置落地",
      rules: "生成配置",
    }[activeStep.value]),
    note: stepSummaries.value[activeStep.value],
  },
  {
    label: "输出",
    value: modeSummary.value.output,
    note: readyToGenerate.value ? "前置条件已经齐了。" : "还差一点条件就能直接生成。",
  },
]);
const stickyActionSummary = computed(() => {
  if (readyToGenerate.value) {
    return {
      title: yamlText.value ? "配置已经生成，随时可以继续导出" : "前置条件已齐，直接生成就行",
      note: yamlText.value ? "如果刚改过规则，重新点一次生成，别拿旧 YAML 充数。" : "当前规则和流程都已经到位，不用再东翻西找。",
    };
  }

  if (ruleValidationState.value.issues.length) {
    return {
      title: "先把手写规则格式修顺",
      note: `现在还有 ${ruleValidationState.value.issues.length} 处规则格式没过，强行生成只会给自己添堵。`,
    };
  }

  return {
    title: "还有步骤没走完",
    note: stepSummaries.value[activeStep.value],
  };
});
const setWorkbenchMode = (mode) => {
  if (mode === "subscription") {
    form.generateMode = "subscription";
    return;
  }

  form.generateMode = "relay";
  form.isDirect = mode === "direct";
};
const getStepState = (key) => {
  if (stepStateMap.value[key]) return "complete";
  if (activeStep.value === key) return "active";
  return "pending";
};
const getStepStateLabel = (key) => {
  const labelMap = {
    complete: "已就绪",
    active: "进行中",
    pending: "待处理",
  };
  return labelMap[getStepState(key)];
};
const workspaceTabs = computed(() => {
  const tabs = [
    { key: "fetch", title: "订阅", state: getStepState("fetch"), stateLabel: getStepStateLabel("fetch") },
    {
      key: "nodes",
      title: currentWorkbenchMode.value === "subscription" ? "整理" : "节点",
      state: getStepState("nodes"),
      stateLabel: getStepStateLabel("nodes"),
    },
  ];

  if (form.generateMode !== "subscription") {
    tabs.push({
      key: "landing",
      title: "落地",
      state: getStepState("landing"),
      stateLabel: getStepStateLabel("landing"),
    });
  }

  tabs.push({
    key: "rules",
    title: "导出",
    state: getStepState("rules"),
    stateLabel: getStepStateLabel("rules"),
  });

  return tabs.map((tab, index) => ({
    ...tab,
    index: String(index + 1).padStart(2, "0"),
  }));
});
const currentWorkspaceMeta = computed(() => {
  if (activeWorkspaceTab.value === "fetch") {
    return {
      title: "订阅入口",
      note: currentWorkbenchMode.value === "direct"
        ? "直连模式里这一步可选，但有订阅就能顺手看一眼节点质量。"
        : "先把节点拉进桌面工作台，后面的链路和导出才有东西干活。",
    };
  }

  if (activeWorkspaceTab.value === "nodes") {
    return {
      title: modeSummary.value.nodeTitle,
      note: modeSummary.value.nodeDescription,
    };
  }

  if (activeWorkspaceTab.value === "rules") {
    return {
      title: "规则与导出",
      note: "最后一步单独看，规则、预览和保存都放在这儿，别再让结果区把前面步骤挤成夹心饼干。",
    };
  }

  return {
    title: "落地配置",
    note: form.generateMode === "subscription"
      ? "整理模式不需要落地节点，这一步直接省掉。"
      : "把落地节点参数一次填顺，别在生成前后反复回头补洞。",
  };
});
const isStepExpanded = (key) => !isCompactViewport.value || expandedSteps[key];
const toggleStepPanel = (key) => {
  if (!isCompactViewport.value) return;
  expandedSteps[key] = !expandedSteps[key];
};

const handleGenerate = () => {
  if (!ruleValidationState.value.valid) {
    ElMessage.warning(`先把 ${ruleValidationState.value.issues.length} 条手写规则格式处理好，再生成配置。`);
    return;
  }
  generateYaml();
  activeWorkspaceTab.value = "rules";
  activeOutputTab.value = "preview";
};

const appendLinesToCustomRules = (lines) => {
  const existing = customRuleLines.value;
  const deduped = [...existing];
  lines.forEach((line) => {
    const normalized = line.trim();
    if (normalized && !deduped.includes(normalized)) {
      deduped.push(normalized);
    }
  });
  form.customRulesText = deduped.join("\n");
};

const appendRuleFromDraft = () => {
  if (!ruleDraft.type || !ruleDraft.value.trim() || !ruleDraft.policy) {
    ElMessage.warning("规则类型、匹配值、策略都得填，不然这玩意儿拼不出来。");
    return;
  }
  appendLinesToCustomRules([`${ruleDraft.type},${ruleDraft.value.trim()},${ruleDraft.policy}`]);
  ruleDraft.value = "";
};

const appendRuleSnippet = (snippet) => {
  appendLinesToCustomRules(snippet.lines);
};

const removeCustomRuleLine = (index) => {
  const nextLines = [...customRuleLines.value];
  nextLines.splice(index, 1);
  form.customRulesText = nextLines.join("\n");
};

const clearCustomRules = () => {
  form.customRulesText = "";
};
const syncViewportState = () => {
  const compact = window.innerWidth <= 900;
  const previous = isCompactViewport.value;
  isCompactViewport.value = compact;

  if (!compact) {
    showAdvancedRuleEditor.value = true;
    Object.assign(expandedSteps, {
      fetch: true,
      nodes: true,
      landing: true,
      rules: true,
    });
    return;
  }

  if (!previous && compact) {
    showAdvancedRuleEditor.value = false;
    Object.assign(expandedSteps, {
      fetch: true,
      nodes: true,
      landing: false,
      rules: false,
    });
  }
};

const handleFetchWithLoading = async () => {
  globalLoading.value = true;
  const minTime = new Promise((resolve) => setTimeout(resolve, 800));

  try {
    await handleFetch();
  } finally {
    await minTime;
    globalLoading.value = false;
  }
};

const copyYaml = async () => {
  if (!yamlText.value) return;
  try {
    await desktopApi.copyText(yamlText.value);
    ElMessage.success("Clash 配置已复制到剪贴板");
  } catch {
    ElMessage.error("复制失败，请手动复制");
  }
};

const downloadYaml = async () => {
  if (!yamlText.value) return;
  try {
    const result = await desktopApi.saveYaml("config.yaml", yamlText.value);
    if (result?.canceled) return;
    if (result?.path) {
      lastSavedPath.value = result.path;
      saveConfig();
      ElMessage.success("Clash 配置已保存");
      return;
    }
    ElMessage.success("Clash 配置已下载");
  } catch {
    ElMessage.error("保存失败，请重试");
  }
};

const revealSavedYaml = async () => {
  if (!lastSavedPath.value) return;
  try {
    await desktopApi.revealInFinder(lastSavedPath.value);
  } catch {
    ElMessage.error("无法在 Finder 中定位文件");
  }
};

const removeSelectedNode = (nodeName) => {
  const index = form.dialerProxyGroup.indexOf(nodeName);
  if (index > -1) {
    form.dialerProxyGroup.splice(index, 1);
  }
};

const getRowClassName = ({ row }) => {
  const classes = [];
  if (form.generateMode !== 'subscription' && form.dialerProxyGroup.includes(row.name)) classes.push("selected-row");
  if (isNodeSelectionDisabled.value) classes.push("disabled-row");
  return classes.join(" ");
};

const showOnboarding = () => {
  onboardingRef.value?.show();
};

const onOnboardingComplete = () => {};

const loadDemoConfig = () => {
  form.subscriptionUrl = "https://example.com/subscription";
  form.socksServer = "127.0.0.1";
  form.socksPort = "1080";
  form.socksAlias = "示例落地节点";
  form.isDirect = false;
  ElMessage({
    message: "已载入示例值，记得替换成你的真实订阅和落地节点。",
    type: "info",
    duration: 5000,
  });
};

onMounted(async () => {
  syncViewportState();
  window.addEventListener("resize", syncViewportState);
  clearLegacyStorage();

  if (isDesktopShell) {
    try {
      const savedDesktopState = await desktopApi.loadState();
      if (savedDesktopState?.form) {
        Object.assign(form, savedDesktopState.form);
        lastSavedPath.value = savedDesktopState.lastSavedPath || "";
        // 恢复复杂协议落地节点的解析对象
        if (form.landingNodeUrl && !MANUAL_LANDING_TYPES.has(form.landingNodeType)) {
          parseLandingNodeUrl();
        }
        return;
      }
    } catch {}
  }

  const savedConfig = loadSavedConfig();
  if (savedConfig) {
    Object.assign(form, savedConfig);
    // 恢复复杂协议落地节点的解析对象
    if (form.landingNodeUrl && !MANUAL_LANDING_TYPES.has(form.landingNodeType)) {
      parseLandingNodeUrl();
    }
    if (isDesktopShell) {
      desktopApi.saveState({
        version: DESKTOP_STATE_VERSION,
        form: desktopPersistedKeys.reduce((acc, key) => {
          acc[key] = Array.isArray(form[key]) ? [...form[key]] : form[key];
          return acc;
        }, {}),
        lastSavedPath: "",
      }).catch(() => {});
    }
  }
});

onBeforeUnmount(() => {
  window.removeEventListener("resize", syncViewportState);
  if (saveConfigTimer) window.clearTimeout(saveConfigTimer);
});

watch(form, saveConfig, { deep: true });

// [P2] 关键配置变化时自动清空已生成的 YAML，防止导出过期配置
watch(
  () => [
    form.generateMode,
    form.isDirect,
    form.landingNodeType,
    form.socksServer,
    form.socksPort,
    form.socksAlias,
    form.landingNodeUrl,
    form.dialerProxyGroup,
    form.dialerProxyType,
    form.customRulesText,
  ],
  () => {
    if (yamlText.value) {
      yamlText.value = "";
      previousYaml.value = "";
    }
  },
  { deep: true }
);
watch(nodes, () => {
  if (yamlText.value) {
    yamlText.value = "";
    previousYaml.value = "";
  }
});

watch(activeStep, (step) => {
  if (workspaceTabs.value.some((tab) => tab.key === step)) {
    activeWorkspaceTab.value = step;
  }
  if (isCompactViewport.value) {
    expandedSteps[step] = true;
  }
});

watch(currentWorkbenchMode, (mode) => {
  if (mode === "subscription" && activeWorkspaceTab.value === "landing") {
    activeWorkspaceTab.value = "nodes";
  }
  ruleDraft.policy = mode === 'subscription' ? '🌐 代理出口' : landingPolicyName.value;
}, { immediate: true });

watch(landingPolicyName, (newName) => {
  if (form.generateMode !== 'subscription' && ruleDraft.policy.startsWith('🎯')) {
    ruleDraft.policy = newName;
  }
});

watch(yamlText, (value) => {
  if (value) {
    activeOutputTab.value = "preview";
  }
});
</script>

<style>
/* ═══════════════════════════════════════════
   新版流式布局
   ═══════════════════════════════════════════ */
.layout-flow {
  display: flex;
  flex-direction: column;
  gap: 14px;
  flex: 1;
  min-height: 0;
  overflow: hidden;
}

/* ── 顶部信息条 ── */
.dashboard-strip {
  display: flex;
  align-items: center;
  gap: 16px;
  flex-shrink: 0;
  padding: 10px 16px;
  border-radius: 18px;
  background: rgba(253, 251, 247, 0.9);
  border: 1px solid var(--line-300);
  box-shadow: 0 8px 20px rgba(22, 23, 24, 0.05);
}

.dashboard-left {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-shrink: 0;
}

.dashboard-title {
  font-family: var(--font-serif);
  font-size: 15px;
  color: var(--ink-800);
  white-space: nowrap;
}

.dashboard-center {
  display: flex;
  gap: 8px;
  flex: 1;
  min-width: 0;
  justify-content: center;
}

.dashboard-stat-chip {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 12px;
  border-radius: 999px;
  border: 1px solid rgba(31, 42, 68, 0.06);
  background: rgba(255, 255, 255, 0.75);
  white-space: nowrap;
}

.dashboard-stat-label {
  font-size: 11px;
  color: var(--ink-600);
}

.dashboard-stat-value {
  font-family: var(--font-serif);
  font-size: 14px;
  line-height: 1;
  color: var(--accent-600);
}

.dashboard-right {
  display: flex;
  gap: 6px;
  flex-shrink: 0;
}

.mode-pill {
  appearance: none;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 14px;
  border-radius: 999px;
  border: 1px solid rgba(31, 42, 68, 0.1);
  background: rgba(255, 255, 255, 0.86);
  color: var(--ink-700);
  cursor: pointer;
  font-size: 13px;
  white-space: nowrap;
  transition:
    border-color 0.22s ease,
    background 0.22s ease,
    box-shadow 0.22s ease;
}

.mode-pill:hover {
  border-color: rgba(185, 43, 39, 0.18);
  background: rgba(255, 255, 255, 0.96);
  box-shadow: 0 4px 12px rgba(31, 42, 68, 0.06);
}

.mode-pill.is-active {
  border-color: rgba(185, 43, 39, 0.3);
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.98), rgba(248, 243, 236, 0.96));
  box-shadow: 0 0 0 2px rgba(185, 43, 39, 0.12);
}

.mode-pill-stamp {
  font-size: 12px;
}

.mode-pill.is-active .mode-pill-stamp {
  color: var(--vermillion-500);
}

.mode-pill-label {
  font-weight: 600;
}

.mode-pill.is-active .mode-pill-label {
  color: var(--ink-900);
}

/* ── 全宽主区域 ── */
.layout-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 14px;
  min-width: 0;
  min-height: 0;
}

/* Main contents flex behavior */
.workspace-tabs-shell {
  flex-shrink: 0;
}

.fetch-stage,
.nodes-stage,
.landing-stage,
.rules-stage {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
  overflow: hidden;
}

.desktop-native-note {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 14px 15px;
  border-radius: 16px;
  border: 1px dashed rgba(31, 42, 68, 0.16);
  background: rgba(255, 255, 255, 0.72);
  color: var(--ink-700);
  line-height: 1.6;
}

.desktop-output-toolbar {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-bottom: 16px;
  padding: 14px 16px;
  border-radius: 18px;
  border: 1px solid rgba(31, 42, 68, 0.1);
  background: rgba(255, 255, 255, 0.8);
  box-shadow: 0 14px 30px rgba(26, 26, 26, 0.06);
}

.desktop-output-summary {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.desktop-output-title {
  color: var(--ink-800);
  font-size: 16px;
  font-weight: 700;
}

.desktop-output-note {
  color: var(--ink-600);
  font-size: 13px;
  line-height: 1.65;
}

.desktop-output-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  align-items: center;
}

.step-section {
  position: relative;
  background: rgba(253, 251, 247, 0.88);
  border: 1px solid var(--line-300);
  border-radius: 22px;
  box-shadow: var(--shadow-ink);
  min-height: 0;
}

.step-section::before {
  content: "";
  position: absolute;
  inset: 0;
  border-radius: inherit;
  pointer-events: none;
  background:
    linear-gradient(135deg, rgba(255, 255, 255, 0.65), rgba(255, 255, 255, 0.08)),
    linear-gradient(180deg, rgba(31, 42, 68, 0.02), transparent 35%);
}

.step-header,
.step-body {
  position: relative;
  z-index: 1;
}

.workflow-kicker,
.sticky-action-kicker,
.stage-note-kicker,
.fetch-action-kicker {
  display: inline-flex;
  align-items: center;
  min-height: 26px;
  padding: 4px 10px;
  border-radius: 999px;
  border: 1px solid rgba(31, 42, 68, 0.12);
  background: rgba(255, 255, 255, 0.72);
  font-size: 12px;
  color: var(--ink-600);
}

/* (旧版 workflow-title-row / workflow-title / workflow-desc 已移至 dashboard-*) */

.workflow-stamp {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 8px 12px;
  border-radius: 999px;
  background: rgba(185, 43, 39, 0.08);
  border: 1px solid rgba(185, 43, 39, 0.2);
  color: var(--vermillion-500);
  font-family: var(--font-serif);
  font-size: 13px;
  letter-spacing: 0.12em;
}

/* (旧版 workflow-ribbon-stats / workflow-stat-card 已移至 dashboard-stat-*) */

/* (mode-workbench 已废弃，合并到 dashboard-modes) */

.mode-card-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.mode-card {
  appearance: none;
  position: relative;
  overflow: hidden;
  text-align: left;
  display: flex;
  flex-direction: column;
  gap: 7px;
  padding: 12px 13px 13px;
  border-radius: 15px;
  border: 1px solid rgba(31, 42, 68, 0.1);
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.94), rgba(249, 246, 241, 0.9));
  cursor: pointer;
  isolation: isolate;
  transition:
    transform 0.22s ease,
    border-color 0.28s ease,
    box-shadow 0.28s ease,
    background 0.28s ease;
}

.mode-card::before {
  content: "";
  position: absolute;
  inset: 0;
  z-index: 0;
  border-radius: inherit;
  background:
    radial-gradient(circle at 14% 16%, rgba(185, 43, 39, 0.09), transparent 32%),
    linear-gradient(135deg, rgba(255, 255, 255, 0.56), rgba(255, 255, 255, 0));
  opacity: 0.46;
  transform: translateY(10px) scale(1.02);
  transition:
    opacity 0.28s ease,
    transform 0.34s cubic-bezier(0.22, 1, 0.36, 1);
}

.mode-card::after {
  content: "";
  position: absolute;
  inset: 0;
  z-index: 0;
  border-radius: inherit;
  background: linear-gradient(110deg, transparent 20%, rgba(255, 255, 255, 0.34) 48%, transparent 74%);
  opacity: 0;
  transform: translateX(-38%);
  transition:
    opacity 0.22s ease,
    transform 0.42s cubic-bezier(0.22, 1, 0.36, 1);
}

.mode-card > * {
  position: relative;
  z-index: 1;
}

.mode-card:hover {
  border-color: rgba(185, 43, 39, 0.18);
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.96), rgba(250, 246, 239, 0.94));
  box-shadow: 0 10px 20px rgba(31, 42, 68, 0.05);
}

.mode-card:hover::before {
  opacity: 0.95;
  transform: translateY(0) scale(1);
}

.mode-card:hover::after {
  opacity: 0.9;
  transform: translateX(30%);
}

.mode-card:hover .mode-card-stamp {
  background: rgba(185, 43, 39, 0.14);
  color: var(--vermillion-500);
}

.mode-card:hover .mode-card-title {
  color: #181615;
}

.mode-card:hover .mode-card-tag {
  background: rgba(88, 112, 103, 0.15);
  color: #445a52;
}

.mode-card:hover .mode-card-desc,
.mode-card:hover .mode-card-foot {
  color: #556274;
}

.mode-card.is-active {
  border-color: rgba(185, 43, 39, 0.3);
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.98), rgba(248, 243, 236, 0.96));
  box-shadow: 0 0 0 2px rgba(185, 43, 39, 0.15);
}

.mode-card-stamp {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: fit-content;
  min-width: 58px;
  min-height: 28px;
  padding: 4px 10px;
  border-radius: 999px;
  background: rgba(31, 42, 68, 0.08);
  color: var(--accent-600);
  font-family: var(--font-serif);
  font-size: 12px;
  transition:
    transform 0.28s cubic-bezier(0.22, 1, 0.36, 1),
    background 0.28s ease,
    color 0.28s ease,
    box-shadow 0.28s ease;
}

.mode-card.is-active .mode-card-stamp {
  background: rgba(185, 43, 39, 0.1);
  color: var(--vermillion-500);
}

.mode-card-title-row {
  display: flex;
  justify-content: space-between;
  gap: 8px;
  align-items: flex-start;
  flex-wrap: wrap;
}

.mode-card-title {
  font-family: var(--font-serif);
  font-size: 15px;
  line-height: 1.25;
  color: var(--ink-800);
  transition: transform 0.28s cubic-bezier(0.22, 1, 0.36, 1), color 0.28s ease;
}

.mode-card-tag {
  font-size: 11px;
  color: var(--bamboo-500);
  border-radius: 999px;
  background: rgba(88, 112, 103, 0.08);
  padding: 4px 10px;
  transition: background 0.28s ease, color 0.28s ease;
}

.mode-card-desc,
.mode-card-foot {
  color: var(--ink-600);
  line-height: 1.5;
  font-size: 12px;
  transition: color 0.28s ease;
}

.mode-card-foot {
  display: none;
}

.workspace-tab-strip,
.output-tab-strip {
  display: flex;
  gap: 10px;
}

.workspace-tab-strip {
  flex-wrap: wrap;
}

.workspace-tab-button,
.output-tab-button {
  appearance: none;
  border: 1px solid rgba(31, 42, 68, 0.1);
  background: rgba(255, 255, 255, 0.86);
  color: var(--ink-700);
  cursor: pointer;
  transition:
    border-color 0.22s ease,
    background 0.22s ease,
    color 0.22s ease,
    box-shadow 0.22s ease,
    transform 0.22s ease;
}

.workspace-tab-button {
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: center;
  gap: 10px;
  min-width: 148px;
  padding: 10px 12px;
  border-radius: 16px;
}

.workspace-tab-button:hover,
.output-tab-button:hover {
  transform: translateY(-1px);
  border-color: rgba(185, 43, 39, 0.16);
  box-shadow: 0 10px 18px rgba(31, 42, 68, 0.04);
}

.workspace-tab-button.is-active,
.output-tab-button.is-active {
  border-color: rgba(185, 43, 39, 0.22);
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.98), rgba(248, 243, 236, 0.96));
  box-shadow: inset 0 0 0 1px rgba(185, 43, 39, 0.08);
}

.workspace-tab-index {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: 999px;
  background: rgba(31, 42, 68, 0.08);
  color: var(--accent-600);
  font-size: 11px;
  font-weight: 700;
}

.workspace-tab-label {
  font-size: 13px;
  font-weight: 700;
  color: var(--ink-800);
}

.workspace-tab-state {
  display: inline-flex;
  align-items: center;
  min-height: 24px;
  padding: 4px 8px;
  border-radius: 999px;
  font-size: 11px;
  white-space: nowrap;
}

.workspace-tab-state.is-complete {
  background: rgba(88, 112, 103, 0.1);
  color: var(--bamboo-500);
}

.workspace-tab-state.is-active {
  background: rgba(185, 43, 39, 0.1);
  color: var(--vermillion-500);
}

.workspace-tab-state.is-pending {
  background: rgba(31, 42, 68, 0.08);
  color: var(--ink-600);
}

/* workspace-tab-copy 已从模板中移除 */

.output-tab-strip {
  margin-bottom: 14px;
}

.output-tab-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 36px;
  padding: 0 14px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 700;
}

.empty-preview-card {
  display: flex;
  flex: 1;
  min-height: 0;
  flex-direction: column;
  gap: 8px;
  justify-content: center;
  align-items: flex-start;
  padding: 20px;
  border-radius: 16px;
  border: 1px dashed rgba(31, 42, 68, 0.14);
  background: rgba(255, 255, 255, 0.66);
}

.empty-preview-card strong {
  font-family: var(--font-serif);
  font-size: 18px;
  color: var(--ink-800);
}

.empty-preview-card span {
  color: var(--ink-600);
  line-height: 1.6;
}

.step-section {
  padding: 16px 18px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.step-section.state-active {
  box-shadow: inset 0 0 0 1px rgba(31, 42, 68, 0.08), var(--shadow-ink);
}

.step-section.state-complete {
  border-color: rgba(88, 112, 103, 0.18);
}

.step-header {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding-bottom: 14px;
  border-bottom: 1px solid var(--line-200);
}

.step-header.is-collapsible {
  cursor: pointer;
  transition:
    border-color 0.24s ease,
    background 0.24s ease,
    box-shadow 0.24s ease,
    transform 0.24s ease;
}

@media (hover: hover) {
  .step-header.is-collapsible:hover {
    margin: 0 -8px;
    padding: 6px 8px 16px;
    border-radius: 16px;
    border-bottom-color: rgba(185, 43, 39, 0.16);
    background: linear-gradient(180deg, rgba(255, 255, 255, 0.72), rgba(250, 247, 242, 0.82));
    box-shadow: 0 12px 24px rgba(31, 42, 68, 0.06);
    transform: translateY(-1px);
  }

  .step-header.is-collapsible:hover .step-title {
    color: #181615;
  }

  .step-header.is-collapsible:hover .step-toggle-icon {
    color: var(--vermillion-500);
  }
}

.step-number {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 34px;
  flex-shrink: 0;
  border-radius: 50%;
  background: var(--accent-600);
  color: white;
  font-weight: 700;
  font-size: 14px;
}

.step-heading {
  flex: 1;
  min-width: 0;
}

.step-heading-top {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px;
}

.step-title {
  font-family: var(--font-serif);
  font-size: 20px;
  color: var(--accent-600);
}

.step-heading-note {
  margin-top: 6px;
  font-size: 13px;
  line-height: 1.6;
  color: var(--ink-600);
}

.step-state-badge,
.selection-count,
.strategy-count-tag {
  display: inline-flex;
  align-items: center;
  min-height: 26px;
  padding: 4px 10px;
  border-radius: 999px;
  font-size: 12px;
}

.step-state-badge.is-complete {
  background: rgba(88, 112, 103, 0.1);
  color: var(--bamboo-500);
}

.step-state-badge.is-active {
  background: rgba(185, 43, 39, 0.1);
  color: var(--vermillion-500);
}

.step-state-badge.is-pending {
  background: rgba(31, 42, 68, 0.08);
  color: var(--ink-600);
}

.step-badge {
  margin-left: auto;
  align-self: center;
  padding: 4px 10px;
  border-radius: 999px;
  background: rgba(31, 42, 68, 0.08);
  font-size: 12px;
  color: var(--ink-700);
}

.step-toggle-icon {
  align-self: center;
  color: var(--ink-600);
  transition:
    transform 0.2s ease,
    color 0.2s ease;
}

.step-toggle-icon.is-open {
  transform: rotate(180deg);
}

.step-body {
  padding-top: 16px;
  flex: 1;
  min-height: 0;
  overflow-y: auto;
}

.title-wrapper {
  display: flex;
  align-items: center;
  gap: 16px;
}

.hero-seal {
  flex-shrink: 0;
}

.history-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
}

.history-url {
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 440px;
  white-space: nowrap;
}

.fetch-grid {
  display: grid;
  grid-template-columns: minmax(0, 1.4fr) minmax(280px, 0.6fr);
  gap: 16px;
  align-items: start;
}

.fetch-action-card,
.stage-note-card,
.readonly-note-card,
.strategy-config,
.rule-card,
.subscription-skip-hint {
  border-radius: 18px;
  border: 1px solid rgba(31, 42, 68, 0.1);
  background: rgba(255, 255, 255, 0.68);
}

.fetch-action-card {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 16px;
}

.fetch-action-title {
  font-family: var(--font-serif);
  font-size: 18px;
  color: var(--ink-800);
}

.fetch-action-desc {
  font-size: 13px;
  line-height: 1.65;
  color: var(--ink-600);
}

.fetch-action-button {
  width: 100%;
  margin-top: auto;
}

.stage-note-card {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 14px 16px;
  margin-bottom: 14px;
}

.stage-note-card.mode-relay {
  border-color: rgba(185, 43, 39, 0.18);
}

.stage-note-card.mode-direct {
  border-color: rgba(88, 112, 103, 0.18);
}

.stage-note-card.mode-subscription {
  border-color: rgba(31, 42, 68, 0.14);
}

.stage-note-title {
  font-family: var(--font-serif);
  font-size: 17px;
  color: var(--ink-800);
}

.stage-note-desc,
.readonly-note-card span {
  font-size: 13px;
  line-height: 1.65;
  color: var(--ink-600);
}

.readonly-note-card {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 14px 16px;
  margin-bottom: 14px;
}

.readonly-note-card strong {
  font-family: var(--font-serif);
  color: var(--ink-800);
}

.selector-toolbar,
.selector-toolbar-filters,
.selector-toolbar-actions,
.strategy-config-header,
.yaml-header,
.rule-card-actions {
  display: flex;
  align-items: center;
  gap: 10px;
}

.rule-card-actions {
  justify-content: flex-start;
  flex-wrap: wrap;
}

.rule-card-actions .el-button.is-text {
  border-radius: 999px;
  padding-inline: 12px;
  transition:
    transform 0.22s ease,
    background 0.22s ease,
    color 0.22s ease,
    box-shadow 0.22s ease;
}

.rule-card-actions .el-button.is-text:hover {
  transform: translateY(-1px);
  background: rgba(31, 42, 68, 0.06);
  color: var(--vermillion-500);
  box-shadow: inset 0 0 0 1px rgba(185, 43, 39, 0.1);
}

.selector-toolbar,
.strategy-config {
  flex-wrap: wrap;
}

.selector-toolbar {
  justify-content: space-between;
  margin-bottom: 12px;
}

.selector-toolbar-filters,
.selector-toolbar-actions {
  flex-wrap: wrap;
}

.selection-count,
.strategy-count-tag {
  background: rgba(185, 43, 39, 0.08);
  color: var(--vermillion-500);
}

.node-tabs {
  margin-bottom: 12px;
}

.node-table-shell {
  position: relative;
  min-height: 0;
}

.node-table-shell.is-readonly {
  filter: saturate(0.86);
}

.node-table-overlay {
  position: absolute;
  inset: 0;
  z-index: 2;
  pointer-events: none;
  background: linear-gradient(to bottom, rgba(253, 251, 247, 0.05), rgba(253, 251, 247, 0.24));
  display: flex;
  align-items: flex-start;
  justify-content: flex-end;
  padding: 12px;
}

.node-table-overlay-text {
  padding: 6px 10px;
  border-radius: 999px;
  background: rgba(253, 251, 247, 0.92);
  color: var(--ink-600);
  font-size: 12px;
  border: 1px solid rgba(31, 42, 68, 0.12);
}

.node-name {
  display: flex;
  align-items: center;
  gap: 8px;
}

.node-marker {
  width: 8px;
  height: 8px;
  border-radius: 999px;
  background: rgba(31, 42, 68, 0.18);
  transition: all 0.2s ease;
}

.node-marker.active {
  background: var(--vermillion-500);
  box-shadow: 0 0 0 4px rgba(185, 43, 39, 0.12);
}

.el-table .selected-row {
  background-color: rgba(31, 42, 68, 0.04) !important;
  font-weight: 600;
}

.el-table .selected-row td:first-child {
  box-shadow: inset 4px 0 0 -1px var(--vermillion-500) !important;
}

.el-table .disabled-row {
  cursor: default;
}

.el-table .disabled-row td {
  color: #7f8998;
}

.strategy-config {
  margin-top: 16px;
  padding: 16px;
}

.config-label {
  margin-bottom: 8px;
  font-weight: 700;
  color: var(--ink-700);
}

.strategy-tuning {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  align-items: center;
  margin-top: 14px;
}

.tuning-item {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.landing-url-row {
  display: flex;
  gap: 8px;
}

.landing-url-row .el-input {
  flex: 1;
}

.form-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0 16px;
}

.subscription-info-card .step-title {
  color: var(--ink-600);
}

.subscription-skip-hint {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 20px 16px;
}

.subscription-skip-icon {
  font-size: 30px;
  color: var(--accent-600);
  flex-shrink: 0;
}

.subscription-skip-title {
  font-weight: 700;
  color: var(--ink-700);
  margin-bottom: 4px;
}

.subscription-skip-desc {
  font-size: 13px;
  color: var(--ink-600);
  line-height: 1.65;
}

.rule-card {
  padding: 16px;
  flex: 1;
  min-height: 0;
  overflow: auto;
}

.rule-card-header {
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
  gap: 16px;
  align-items: stretch;
  margin-bottom: 14px;
}

.rule-card-header > div:first-child {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.rule-workbench {
  display: grid;
  grid-template-columns: 1fr;
  gap: 14px;
  min-height: 0;
}

.rule-builder-panel,
.rule-editor-panel {
  border-radius: 18px;
  border: 1px solid rgba(31, 42, 68, 0.08);
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.82), rgba(249, 246, 239, 0.82));
  padding: 14px;
}

.rule-builder-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  gap: 10px;
  margin-bottom: 10px;
}

.rule-builder-row:last-of-type {
  grid-template-columns: minmax(0, 1fr) auto;
  margin-bottom: 0;
}

.rule-snippets {
  display: flex;
  flex-direction: column;
  gap: 14px;
  margin-top: 14px;
}

.rule-snippet-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.rule-snippets-label {
  display: block;
  font-size: 12px;
  color: var(--ink-600);
}

.rule-snippet-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.rule-snippet-chip {
  appearance: none;
  border: 1px solid rgba(31, 42, 68, 0.12);
  background: rgba(255, 255, 255, 0.92);
  color: var(--ink-700);
  border-radius: 999px;
  padding: 7px 12px;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.rule-snippet-chip:hover {
  border-color: rgba(185, 43, 39, 0.28);
  color: var(--vermillion-500);
  background: rgba(185, 43, 39, 0.05);
}

.rule-lines-board {
  margin-top: 14px;
  border-top: 1px dashed rgba(31, 42, 68, 0.12);
  padding-top: 12px;
}

.rule-lines-header {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  font-size: 12px;
  color: var(--ink-600);
  margin-bottom: 8px;
}

.rule-lines-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-height: 260px;
  overflow: auto;
}

.rule-line-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 12px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.9);
  border: 1px solid rgba(31, 42, 68, 0.08);
}

.rule-line-main {
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-width: 0;
}

.rule-line-meta {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.rule-mini-chip {
  display: inline-flex;
  align-items: center;
  padding: 4px 8px;
  border-radius: 999px;
  background: rgba(31, 42, 68, 0.08);
  color: var(--accent-600);
  font-size: 11px;
}

.rule-mini-chip.is-policy {
  background: rgba(185, 43, 39, 0.08);
  color: var(--vermillion-500);
}

.rule-line-code {
  font-family: var(--font-mono);
  font-size: 12px;
  color: #334155;
  word-break: break-all;
}

.rule-validation-card {
  margin-bottom: 10px;
  padding: 10px 12px;
  border-radius: 12px;
  font-size: 12px;
  line-height: 1.6;
}

.rule-validation-card.is-error {
  background: rgba(185, 43, 39, 0.08);
  border: 1px solid rgba(185, 43, 39, 0.18);
  color: #8f2320;
}

.rule-validation-card.is-ok {
  background: rgba(88, 112, 103, 0.08);
  border: 1px solid rgba(88, 112, 103, 0.18);
  color: var(--bamboo-500);
}

.rule-validation-title {
  font-weight: 700;
  margin-bottom: 4px;
}

.format-tip {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 14px;
  padding: 12px 14px;
  border-radius: 14px;
  background: rgba(31, 42, 68, 0.06);
  color: var(--ink-700);
  font-size: 13px;
}

.yaml-section {
  margin-top: 0;
  display: flex;
  flex: 1;
  min-height: 0;
  flex-direction: column;
}

.yaml-header {
  justify-content: space-between;
  margin-bottom: 10px;
}

.yaml-heading {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.yaml-title {
  font-family: var(--font-serif);
  font-size: 18px;
  color: var(--ink-800);
}

.yaml-note {
  font-size: 12px;
  color: var(--ink-600);
}

.yaml-actions {
  display: flex;
  gap: 8px;
}

.yaml-actions .el-button {
  transition:
    transform 0.22s ease,
    box-shadow 0.22s ease;
}

.yaml-actions .el-button:hover {
  transform: translateY(-1px);
  box-shadow: 0 10px 16px rgba(31, 42, 68, 0.08);
}

.sticky-action-bar {
  position: fixed;
  left: max(18px, env(safe-area-inset-left));
  right: max(18px, env(safe-area-inset-right));
  bottom: max(14px, env(safe-area-inset-bottom));
  z-index: 40;
  display: grid;
  grid-template-columns: minmax(0, 1.2fr) auto auto;
  align-items: center;
  gap: 14px;
  padding: 14px 16px;
  border-radius: 20px;
  background: rgba(27, 27, 30, 0.92);
  color: rgba(255, 255, 255, 0.92);
  box-shadow: 0 22px 38px rgba(0, 0, 0, 0.28);
  backdrop-filter: blur(16px);
}

.sticky-action-copy {
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 0;
}

.sticky-action-copy .sticky-action-kicker {
  width: fit-content;
  background: rgba(255, 255, 255, 0.08);
  color: rgba(255, 255, 255, 0.75);
  border-color: rgba(255, 255, 255, 0.08);
}

.sticky-action-title {
  font-family: var(--font-serif);
  font-size: 18px;
}

.sticky-action-note {
  font-size: 12px;
  line-height: 1.6;
  color: rgba(255, 255, 255, 0.72);
}

.sticky-action-indicator {
  justify-self: center;
}

.sticky-state-pill {
  display: inline-flex;
  align-items: center;
  min-height: 30px;
  padding: 6px 12px;
  border-radius: 999px;
  font-size: 12px;
}

.sticky-state-pill.is-ready {
  background: rgba(88, 112, 103, 0.18);
  color: #d8f3e3;
}

.sticky-state-pill.is-blocked {
  background: rgba(185, 43, 39, 0.18);
  color: #ffd9d4;
}

.sticky-action-buttons {
  display: flex;
  gap: 8px;
  align-items: center;
  justify-self: end;
}

.sticky-action-buttons .el-button:not(.el-button--primary) {
  --el-button-text-color: rgba(255, 255, 255, 0.88);
  --el-button-bg-color: rgba(255, 255, 255, 0.08);
  --el-button-border-color: rgba(255, 255, 255, 0.14);
  --el-button-hover-text-color: #ffffff;
  --el-button-hover-bg-color: rgba(255, 255, 255, 0.18);
  --el-button-hover-border-color: rgba(255, 255, 255, 0.26);
  --el-button-active-text-color: #ffffff;
  --el-button-active-bg-color: rgba(255, 255, 255, 0.22);
  --el-button-active-border-color: rgba(255, 255, 255, 0.3);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.04);
}

.sticky-action-buttons .el-button:not(.el-button--primary):hover {
  transform: translateY(-1px);
}

.sticky-action-buttons .el-button.is-disabled:not(.el-button--primary),
.sticky-action-buttons .el-button.is-disabled:not(.el-button--primary):hover {
  --el-button-text-color: rgba(255, 255, 255, 0.36);
  --el-button-bg-color: rgba(255, 255, 255, 0.05);
  --el-button-border-color: rgba(255, 255, 255, 0.08);
  box-shadow: none;
  transform: none;
}

.sticky-action-buttons .el-button--primary {
  box-shadow:
    0 14px 28px rgba(24, 50, 112, 0.28),
    inset 0 1px 0 rgba(255, 255, 255, 0.08);
  transition:
    transform 0.22s ease,
    box-shadow 0.22s ease,
    filter 0.22s ease;
}

.sticky-action-buttons .el-button--primary:hover {
  transform: translateY(-1px);
  filter: saturate(1.08);
  box-shadow:
    0 18px 30px rgba(24, 50, 112, 0.34),
    inset 0 1px 0 rgba(255, 255, 255, 0.12);
}

@media (max-width: 1100px) {
  .dashboard-strip {
    flex-wrap: wrap;
  }

  .dashboard-center {
    display: none;
  }

  .layout-flow {
    overflow-y: auto;
  }

  .fetch-grid,
  .rule-workbench {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 900px) {
  .step-section {
    padding: 16px;
  }

  .step-header {
    padding-bottom: 12px;
  }

  .step-badge {
    display: none;
  }

  .landing-url-row,
  .selector-toolbar,
  .selector-toolbar-filters,
  .selector-toolbar-actions,
  .workspace-tab-strip,
  .rule-card-header,
  .rule-card-actions,
  .yaml-header,
  .rule-builder-row,
  .rule-builder-row:last-of-type {
    flex-direction: column;
    align-items: stretch;
  }

  .rule-builder-row,
  .rule-builder-row:last-of-type {
    display: flex;
  }

  .form-grid {
    grid-template-columns: 1fr;
  }

  .history-url {
    max-width: 220px;
  }

  .workspace-tab-button {
    min-width: 0;
    grid-template-columns: auto 1fr;
  }

  .workspace-tab-state {
    grid-column: 1 / -1;
    justify-self: start;
  }

  .sticky-action-bar {
    grid-template-columns: 1fr;
    align-items: stretch;
  }

  .sticky-action-indicator,
  .sticky-action-buttons {
    justify-self: stretch;
  }

  .sticky-action-buttons {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }

  .sticky-action-buttons .el-button:last-child {
    grid-column: 1 / -1;
  }
}

@media (max-width: 640px) {
  .workflow-title-row {
    flex-direction: column;
    align-items: flex-start;
  }

  .step-title {
    font-size: 18px;
  }

  .rule-line-item,
  .subscription-skip-hint {
    align-items: flex-start;
  }

  .rule-line-item {
    flex-direction: column;
  }
}
</style>
