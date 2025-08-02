<template>
  <view class="dashboard">
    <!-- Term Selector -->
    <picker mode="selector" :range="pickerColumns" range-key="text" @change="onTermChange">
      <nut-cell
        title="选择学期"
        :desc="selectedTerm?.name || '请选择'"
        is-link
      ></nut-cell>
    </picker>

    <!-- Term Navigation -->
    <view class="term-selector">
      <nut-button
        size="small"
        icon="left"
   :disabled="isNextButtonDisabled"
        @click="navigateTerm(1)"
      >上个学期</nut-button>
      <view class="term-name">{{ currentStats?.term_name || '加载中...' }}</view>
      <nut-button
        size="small"
        icon="right"
      
               :disabled="isPrevButtonDisabled"
        @click="navigateTerm(-1)"
      >下个学期</nut-button>
    </view>

    <nut-cell-group :title="`核心指标看板 (KPIs) - ${currentStats?.term_name || ''}`">
      <nut-cell title="总收入" :desc="currentStats?.total_revenue ? `¥ ${currentStats.total_revenue}` : '加载中...'"></nut-cell>
      <nut-cell title="待支付总金额" :desc="currentStats?.pending_revenue ? `¥ ${currentStats.pending_revenue}`: '加载中...'"></nut-cell>
      <nut-cell title="课程总数" :desc="currentStats?.total_courses ?? '加载中...'"></nut-cell>
      <nut-cell title="学生参与率" :desc="currentStats?.participation_rate ? `${currentStats.participation_rate}% (${currentStats.participating_students} / ${currentStats.total_students})` : '加载中...'"></nut-cell>
      <nut-cell title="总选课人次" :desc="currentStats?.total_selections ?? '加载中...'"></nut-cell>
      <nut-cell title="课程平均饱和度" :desc="currentStats?.average_saturation ? `${currentStats.average_saturation}%` : '加载中...'"></nut-cell>
    </nut-cell-group>
    
    <nut-cell-group title="报表导出">
      <nut-button type="primary" block @click="exportAllStats">导出总报表 (XLSX)</nut-button>
    </nut-cell-group>
  </view>
</template>

<script setup>
import { onMounted, ref, computed } from 'vue';
import { getStats, getTerms } from '../../api/stats';
import Taro from '@tarojs/taro';

// --- State ---
const allStats = ref([]);
const termList = ref([]);
const selectedTerm = ref(null);
const currentTermIndex = ref(0); // Index for allStats when 'All' is selected, or for termList otherwise.

// --- Computed ---
const currentStats = computed(() => {
  if (selectedTerm.value?.id === 'all') {
    if (allStats.value.length > 0) {
      return allStats.value[currentTermIndex.value];
    }
  } else if (allStats.value.length === 1) {
    return allStats.value[0];
  }
  return {};
});

const pickerColumns = computed(() => {
  return termList.value.map(term => ({ text: term.name, value: term.id }));
});

const isPrevButtonDisabled = computed(() => {
    if (selectedTerm.value?.id === 'all') {
        return currentTermIndex.value <= 0;
    }
    const singleTermList = termList.value.filter(t => t.id !== 'all');
    const currentIndexInSingle = singleTermList.findIndex(t => t.id === selectedTerm.value?.id);
    return currentIndexInSingle <= 0;
});

const isNextButtonDisabled = computed(() => {
    if (selectedTerm.value?.id === 'all') {
        return currentTermIndex.value >= allStats.value.length - 1;
    }
    const singleTermList = termList.value.filter(t => t.id !== 'all');
    const currentIndexInSingle = singleTermList.findIndex(t => t.id === selectedTerm.value?.id);
    return currentIndexInSingle >= singleTermList.length - 1;
});


// --- Methods ---

const fetchStats = async (termId) => {
  allStats.value = [];
  currentTermIndex.value = 0;
  
  Taro.showLoading({ title: '加载中...' });
  try {
    const params = termId === 'all' ? undefined : { semester: termId };
    const res = await getStats('kpi', params);
    
    if (res && res.state === 'success') {
      allStats.value = res.data;
      if (!res.data || res.data.length === 0) {
         Taro.showToast({ title: '当前学期无数据', icon: 'none' });
      }
    } else {
      Taro.showToast({ title: res.reason || '数据加载失败', icon: 'none' });
    }
  } catch (error) {
    console.error('Failed to fetch KPI stats:', error);
    Taro.showToast({ title: '网络请求异常', icon: 'none' });
  } finally {
    Taro.hideLoading();
  }
};

const loadTerms = async () => {
  try {
    const res = await getTerms();
    if (res && res.state === 'success') {
      // Add "All" option to the beginning
     // termList.value = [{ id: 'all', name: '全部学期' }, ...res.data];
     termList.value = [ ...res.data];

      // Default to the latest term
      if (res.data.length > 0) {
        selectedTerm.value = res.data[0];
      } else {
        selectedTerm.value = termList.value[0]; // fallback to "All"
      }
      await fetchStats(selectedTerm.value.id);
    } else {
       Taro.showToast({ title: res.reason || '学期列表加载失败', icon: 'none' });
    }
  } catch (error) {
    console.error('Failed to load terms:', error);
    Taro.showToast({ title: '网络请求异常', icon: 'none' });
  }
};

const onTermChange = (e) => {
  const newIndex = e.detail.value;
  selectedTerm.value = termList.value[newIndex];
  fetchStats(selectedTerm.value.id);
};

const exportAllStats = () => {
  const baseUrl = BASE_URL.replace(/"/g, '');
  const downloadUrl = `${baseUrl}/stats/export`;

  Taro.showLoading({ title: '正在生成报表...' });

  Taro.downloadFile({
    url: downloadUrl,
    success: (res) => {
      Taro.hideLoading();
      if (res.statusCode === 200) {
        Taro.openDocument({
          filePath: res.tempFilePath,
          showMenu: true,
          fileType: 'xlsx',
          fail: (err) => {
            console.error('打开文件失败', err);
            Taro.showToast({
              title: '打开文件失败，请确保手机已安装WPS或Office等应用',
              icon: 'none',
              duration: 3000
            });
          }
        });
      } else {
        console.error('下载文件失败', res);
        Taro.showToast({ title: `导出失败: ${res.statusCode}`, icon: 'none' });
      }
    },
    fail: (err) => {
      Taro.hideLoading();
      console.error('下载请求失败', err);
      Taro.showToast({
        title: '请求失败, 请检查网络',
        icon: 'none',
        duration: 3000
      });
    }
  });
};

const navigateTerm = (direction) => {
    if (selectedTerm.value?.id === 'all') {
        const newIndex = currentTermIndex.value + direction;
        if (newIndex >= 0 && newIndex < allStats.value.length) {
            currentTermIndex.value = newIndex;
        }
    } else {
        const singleTermList = termList.value.filter(t => t.id !== 'all');
        const currentIndex = singleTermList.findIndex(t => t.id === selectedTerm.value.id);
        const newIndex = currentIndex + direction;

        if (newIndex >= 0 && newIndex < singleTermList.length) {
            selectedTerm.value = singleTermList[newIndex];
            fetchStats(selectedTerm.value.id);
        }
    }
};

onMounted(loadTerms);

</script>

<style lang="scss">
.dashboard {
  padding: 16px;
}
.term-selector {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px;
  background-color: #f7f7f7;
  border-radius: 8px;
  margin-top: 10px;
  margin-bottom: 20px;
}
.term-name {
  font-size: 16px;
  font-weight: bold;
}
.nut-cell-group {
  margin-bottom: 20px;
}
</style>
