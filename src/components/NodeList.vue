<template>
  <div class="section-card">
    <div class="section-title">2. 选择跳板节点</div>
    <el-form label-position="top">
      <el-form-item label="跳板节点 (Dialer-Proxy) - 支持多选">
        <el-select
          v-model="form.dialerProxyGroup"
          multiple
          placeholder="选择跳板节点（可多选）"
          filterable
          collapse-tags
          collapse-tags-tooltip
          :max-collapse-tags="3"
          style="width: 100%;"
        >
          <el-option v-for="node in filteredNodes" :key="node.name" :label="node.name" :value="node.name">
            <span>{{ getNodeDisplayName(node) }}</span>
            <span
              v-if="node.latency && node.latency > 0"
              :style="{ color: node.latency < 300 ? '#67c23a' : '#f56c6c', marginLeft: '8px', fontWeight: 'bold' }"
            >
              ({{ node.latency }}ms)
            </span>
            <span
              v-else-if="node.latency === -2"
              style="color: #f56c6c; margin-left: 8px; font-weight: bold;"
            >
              (超时)
            </span>
          </el-option>
        </el-select>
      </el-form-item>
      <el-form-item v-if="form.dialerProxyGroup.length > 1" label="策略组类型">
        <el-radio-group v-model="form.dialerProxyType">
          <el-radio value="url-test">自动选择（url-test）</el-radio>
          <el-radio value="select">手动选择（select）</el-radio>
          <el-radio value="fallback">故障转移（fallback）</el-radio>
        </el-radio-group>
        <div class="helper-text">选择多个节点时将生成一个策略组作为前置跳板</div>
      </el-form-item>
      <el-form-item 
        v-if="form.dialerProxyGroup.length > 1 && (form.dialerProxyType === 'url-test' || form.dialerProxyType === 'fallback')" 
        label="健康检查配置"
      >
        <div style="display: flex; align-items: center; gap: 16px; flex-wrap: wrap;">
          <div style="display: flex; align-items: center; gap: 4px;">
            <span>检测间隔:</span>
            <el-input-number 
              v-model="form.urlTestInterval" 
              :min="10" 
              :max="600" 
              :step="10"
              size="small"
              style="width: 100px;"
            />
            <span>秒</span>
          </div>
          <div style="display: flex; align-items: center; gap: 4px;">
            <span>延迟容差:</span>
            <el-input-number 
              v-model="form.urlTestTolerance" 
              :min="0" 
              :max="500" 
              :step="10"
              size="small"
              style="width: 100px;"
            />
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
        <div class="helper-text">较短的检测间隔可实现更快的故障转移，推荐 30-60 秒</div>
      </el-form-item>
    </el-form>
    <div v-if="selectedNodes.length > 0" class="selected-node">
      <div class="selected-node-title">已选中 {{ selectedNodes.length }} 个跳板节点</div>
      <div class="selected-node-content" style="grid-template-columns: 1fr;">
        <div v-for="node in selectedNodes" :key="node.name" style="margin-bottom: 4px;">
          <strong>{{ node.name }}</strong> - {{ node.type }} ({{ node.server }}:{{ node.port }})
        </div>
      </div>
    </div>

    <div class="node-toolbar">
      <el-input
        v-model="nodeSearchModel"
        placeholder="搜索节点..."
        :prefix-icon="Search"
        clearable
        style="width: 200px;"
      />
      <el-select v-model="nodeSortByModel" placeholder="排序方式" style="width: 130px; margin-left: 8px;">
        <el-option label="默认顺序" value="default" />
        <el-option label="按延迟" value="latency" />
        <el-option label="按名称" value="name" />
        <el-option label="按类型" value="type" />
      </el-select>
      <el-button
        type="primary"
        size="small"
        @click="testAllNodesLatency"
        :loading="isTestingValue"
        style="margin-left: 8px;"
      >
        {{ isTestingValue ? '测速中...' : '测试延迟' }}
      </el-button>
      <el-divider direction="vertical" />
      <el-button-group size="small">
        <el-button @click="selectAllNodes" :disabled="displayNodes.length === 0">
          全选
        </el-button>
        <el-button @click="invertSelection" :disabled="displayNodes.length === 0">
          反选
        </el-button>
        <el-button @click="clearSelection" :disabled="form.dialerProxyGroup.length === 0">
          清空
        </el-button>
      </el-button-group>
      <el-divider direction="vertical" />
      <el-switch v-model="healthCheckConfig.enabled" active-text="健康监控" style="margin-left: 4px;" />
      <el-tooltip v-if="healthCheckConfig.enabled" content="正在后台监控节点健康状态">
        <el-icon class="is-loading" style="margin-left: 4px; color: #409eff;"><Loading /></el-icon>
      </el-tooltip>
    </div>

    <el-tabs :model-value="activeNodeGroupModel" @tab-change="handleTabChange" type="card" style="margin-top: 12px;">
      <el-tab-pane label="全部" name="all">
        <span slot="label">全部 ({{ filteredNodes.length }})</span>
      </el-tab-pane>
      <el-tab-pane v-for="group in nodeGroups" :key="group.key" :name="group.key">
        <template #label>{{ group.label }} ({{ group.count }})</template>
      </el-tab-pane>
    </el-tabs>

    <el-table
      :data="displayNodes"
      size="small"
      height="500"
      empty-text="暂无节点，请先获取节点"
      style="width: 100%"
      @row-click="handleNodeRowClick"
      highlight-current-row
    >
      <el-table-column label="节点名称" min-width="280" show-overflow-tooltip>
        <template #default="{ row }">
          <span v-if="healthCheckConfig.enabled" style="margin-right: 4px;">
            <el-icon v-if="getNodeHealthStatus(row.name) === 'healthy'" size="12" style="color: #67c23a;">
              <CircleCheck />
            </el-icon>
            <el-icon
              v-else-if="getNodeHealthStatus(row.name) === 'unhealthy'"
              size="12"
              style="color: #f56c6c;"
            >
              <CircleClose />
            </el-icon>
            <el-icon v-else size="12" style="color: #909399;"><Remove /></el-icon>
          </span>
          {{ row.name }}
        </template>
      </el-table-column>
      <el-table-column label="延迟" width="90">
        <template #default="{ row }">
          <span v-if="row.latency === -1" style="color: #999;">—</span>
          <span v-else-if="row.latency === -2" style="color: #f56c6c;">超时</span>
          <span v-else-if="row.latency" :style="{ color: getLatencyColor(row.latency) }">
            {{ row.latency }}ms
          </span>
          <el-icon v-else class="is-loading" style="color: #409eff;"><Loading /></el-icon>
        </template>
      </el-table-column>
      <el-table-column label="操作" width="120">
        <template #default="{ row }">
          <el-button
            :type="form.dialerProxyGroup.includes(row.name) ? 'success' : 'primary'"
            link
            size="small"
            @click.stop="handleNodeRowClick(row)"
          >
            <span v-if="form.dialerProxyGroup.includes(row.name)" style="display: inline-flex; align-items: center;">
              <el-icon size="14" style="margin-right: 2px;"><Check /></el-icon>已选
            </span>
            <span v-else>选择</span>
          </el-button>

          <el-button
            :type="isFavorite(row.name) ? 'warning' : 'default'"
            link
            size="small"
            @click.stop="toggleFavorite(row.name)"
          >
            <el-icon size="16">
              <StarFilled v-if="isFavorite(row.name)" />
              <Star v-else />
            </el-icon>
          </el-button>
        </template>
      </el-table-column>
      <el-table-column prop="type" label="类型" width="80" />
      <el-table-column prop="server" label="服务器" min-width="120" show-overflow-tooltip />
      <el-table-column prop="port" label="端口" width="70" />
    </el-table>
  </div>
</template>

<script setup>
import { computed } from "vue";
import { Loading, Search, Star, StarFilled, Check, CircleCheck, CircleClose, Remove } from "@element-plus/icons-vue";

const props = defineProps({
  form: { type: Object, required: true },
  selectedNodes: { type: Array, required: true },
  filteredNodes: { type: Array, required: true },
  displayNodes: { type: Array, required: true },
  nodeGroups: { type: Array, required: true },
  nodeSearch: { type: Object, required: true },
  nodeSortBy: { type: Object, required: true },
  activeNodeGroup: { type: [String, Object], required: true },
  isTesting: { type: [Boolean, Object], required: true },
  healthCheckConfig: { type: Object, required: true },
  getNodeDisplayName: { type: Function, required: true },
  getLatencyColor: { type: Function, required: true },
  getNodeHealthStatus: { type: Function, required: true },
  isFavorite: { type: Function, required: true },
  toggleFavorite: { type: Function, required: true },
  handleNodeRowClick: { type: Function, required: true },
  selectAllNodes: { type: Function, required: true },
  invertSelection: { type: Function, required: true },
  clearSelection: { type: Function, required: true },
  testAllNodesLatency: { type: Function, required: true },
  onTabChange: { type: Function, required: true },
});

const unwrapRef = (value) =>
  value && typeof value === "object" && "value" in value ? value.value : value;

const bindRef = (refLike) =>
  computed({
    get: () => unwrapRef(refLike),
    set: (val) => {
      if (refLike && typeof refLike === "object" && "value" in refLike) {
        refLike.value = val;
      }
    },
  });

const nodeSearchModel = bindRef(props.nodeSearch);
const nodeSortByModel = bindRef(props.nodeSortBy);
const activeNodeGroupModel = computed(() => unwrapRef(props.activeNodeGroup));
const isTestingValue = computed(() => unwrapRef(props.isTesting));

// 处理 tab 切换
const handleTabChange = (tabName) => {
  if (props.onTabChange) {
    props.onTabChange(tabName);
  }
};
</script>
