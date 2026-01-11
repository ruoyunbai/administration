<template>
    <view class="finance-orders">
        <!-- Term Selector -->
        <picker mode="selector" :range="termList" range-key="name" @change="onTermChange">
            <nut-cell title="选择学期" :desc="selectedTerm?.name || '请选择'" is-link></nut-cell>
        </picker>

        <!-- Term Navigation -->
        <view class="term-selector">
            <nut-button size="small" icon="left" :disabled="isNextButtonDisabled"
                @click="navigateTerm(1)">上个学期</nut-button>
            <view class="term-name">{{ selectedTerm?.name || '加载中...' }}</view>
            <nut-button size="small" icon="right" :disabled="isPrevButtonDisabled"
                @click="navigateTerm(-1)">下个学期</nut-button>
        </view>

        <nut-cell-group title="订单查询">
            <nut-form label-position="top">
                <nut-form-item label="学生姓名">
                    <nut-input v-model="filters.studentName" placeholder="输入学生姓名"></nut-input>
                </nut-form-item>
                <nut-form-item label="学生电话">
                    <nut-input v-model="filters.studentPhone" type="number" placeholder="输入学生电话"></nut-input>
                </nut-form-item>
                <nut-form-item label="支付状态">
                    <nut-radio-group v-model="filters.status" direction="horizontal">
                        <nut-radio label="unpaid">未支付</nut-radio>
                        <nut-radio label="paid">已支付</nut-radio>
                        <nut-radio label="all">全部</nut-radio>
                    </nut-radio-group>
                </nut-form-item>
                <nut-form-item label="课程筛选">
                    <view class="select-row">
                        <nut-input v-model="filters.courseKeyword" placeholder="输入课程名搜索下拉" clearable></nut-input>
                        <picker class="picker-inline" mode="selector" :range="coursePickerRange" range-key="course_name"
                            @change="onCoursePick">
                            <view class="picker-trigger">
                                <nut-button size="small" type="primary" plain>下拉选择</nut-button>
                            </view>
                        </picker>
                    </view>
                    <view v-if="filters.courseName" class="selected-value">已选课程：{{ filters.courseName }}</view>
                </nut-form-item>
                <nut-form-item label="学校筛选">
                    <view class="select-row">
                        <nut-input v-model="filters.collegeKeyword" placeholder="输入学校名称搜索下拉" clearable></nut-input>
                        <picker class="picker-inline" mode="selector" :range="collegePickerRange"
                            range-key="college_name" @change="onCollegePick">
                            <view class="picker-trigger">
                                <nut-button size="small" type="primary" plain>下拉选择</nut-button>
                            </view>
                        </picker>
                    </view>
                    <view v-if="filters.collegeName" class="selected-value">已选学校：{{ filters.collegeName }}</view>
                </nut-form-item>
            </nut-form>

            <view class="filter-actions">
                <nut-button type="primary" size="small" block @click="onSearch">查询订单</nut-button>
                <nut-button size="small" plain block @click="resetFilters">重置筛选</nut-button>
            </view>
            <view class="filter-hint">输入关键词后，下拉列表会自动过滤；不输入则展示常用项。</view>
        </nut-cell-group>

        <nut-cell-group :title="`${statusLabel}订单结果`">
            <nut-cell title="结果概览" :desc="`共 ${ordersTotal} 单`"></nut-cell>
            <nut-cell v-for="order in orders" :key="String(order.order_id || `${order.user_id}_${order.course_id}`)"
                :title="order.course_name || '订单'" is-link @click="loadStudentDetail(order.user_id)">
                <template #desc>
                    <view class="order-desc">
                        <view class="order-line">{{ order.student_name || '学生' }} · {{ order.student_phone || '-' }} ·
                            {{ order.student_college_name || '-' }}</view>
                        <view class="order-line">¥ {{ Number(order.fee ?? 0).toFixed(2) }} · {{ order.create_time_text
                            || '时间未知' }}</view>
                    </view>
                </template>
            </nut-cell>
            <view v-if="ordersLoading" class="loading-text">查询中...</view>
            <nut-button v-if="ordersHasMore" type="primary" plain block @click="loadMore">加载更多</nut-button>
            <view v-if="!ordersLoading && orders.length === 0" class="empty-state">暂无符合条件的订单</view>
        </nut-cell-group>

        <nut-popup v-model:visible="studentDetailVisible" position="bottom" round closeable
            :close-on-click-overlay="true" :destroy-on-close="true" :safe-area-inset-bottom="true"
            :style="{ height: '70vh' }">
            <scroll-view scroll-y class="detail-popup-scroll">
                <view v-if="studentDetail?.info">
                    <nut-cell-group title="学生信息">
                        <nut-cell title="姓名" :desc="studentDetail.info.real_name || '-'" />
                        <nut-cell title="电话" :desc="studentDetail.info.phone || '-'" />
                        <nut-cell title="邮箱" :desc="studentDetail.info.email || '-'" />
                        <nut-cell title="学号" :desc="studentDetail.info.number || '-'" />
                        <nut-cell title="学校" :desc="studentDetail.info.college_name || '-'" />
                        <nut-cell title="班级" :desc="studentDetail.info.class || '-'" />
                        <nut-cell title="专业" :desc="studentDetail.info.major || '-'" />
                        <nut-cell title="学院" :desc="studentDetail.info.academy || '-'" />
                        <nut-cell v-if="Number(studentDetail.info.has_minor) === 1" title="辅修专业"
                            :desc="studentDetail.info.minor || '-'" />
                        <nut-cell v-if="Number(studentDetail.info.has_minor) === 1" title="辅修证书号"
                            :desc="studentDetail.info.certificate_no || '-'" />
                    </nut-cell-group>
                </view>
                <view v-else class="empty-state">暂无详情</view>
            </scroll-view>
        </nut-popup>
    </view>
</template>

<script setup>
import { onMounted, ref, computed, reactive, watch } from 'vue';
import Taro from '@tarojs/taro';
import { getTerms } from '../../api/stats';
import { getStudentDetail } from '../../api/student';
import { getFinanceFilterOptions, getUnpaidOrders } from '../../api/finance';

const termList = ref([]);
const selectedTerm = ref(null);

const orders = ref([]);
const ordersPage = ref(1);
const ordersPageSize = 20;
const ordersTotal = ref(0);
const ordersHasMore = ref(false);
const ordersLoading = ref(false);

const courseOptions = ref([]);
const collegeOptions = ref([]);

const studentDetail = ref(null);
const studentDetailVisible = ref(false);

const filters = reactive({
    studentName: '',
    studentPhone: '',
    status: 'all',
    courseId: null,
    courseName: '',
    courseKeyword: '',
    collegeId: null,
    collegeName: '',
    collegeKeyword: '',
});

const optionsLoading = ref(false);

const isPrevButtonDisabled = computed(() => {
    if (!selectedTerm.value) return true;
    const currentIndex = termList.value.findIndex(t => t.id === selectedTerm.value.id);
    return currentIndex <= 0;
});

const isNextButtonDisabled = computed(() => {
    if (!selectedTerm.value) return true;
    const currentIndex = termList.value.findIndex(t => t.id === selectedTerm.value.id);
    return currentIndex >= termList.value.length - 1;
});

const statusLabel = computed(() => {
    if (filters.status === 'paid') return '已支付';
    if (filters.status === 'all') return '全部';
    return '未支付';
});

const filteredCourseList = computed(() => {
    const kw = (filters.courseKeyword || '').trim().toLowerCase();
    return (courseOptions.value || []).filter(opt => !kw || String(opt.course_name || '').toLowerCase().includes(kw));
});

const filteredCollegeList = computed(() => {
    const kw = (filters.collegeKeyword || '').trim().toLowerCase();
    return (collegeOptions.value || []).filter(opt => !kw || String(opt.college_name || '').toLowerCase().includes(kw));
});

const coursePickerRange = computed(() => {
    return filteredCourseList.value.length ? filteredCourseList.value : [{ course_id: '', course_name: '暂无数据' }];
});

const collegePickerRange = computed(() => {
    return filteredCollegeList.value.length ? filteredCollegeList.value : [{ college_id: '', college_name: '暂无数据', unpaid_orders: 0 }];
});

const loadStudentDetail = async (userId) => {
    if (!userId) {
        Taro.showToast({ title: '缺少学生信息', icon: 'none' });
        return;
    }
    Taro.showLoading({ title: '加载中...' });
    try {
        const res = await getStudentDetail({ user_id: userId });
        if (res && res.state === 'success' && res.data) {
            studentDetail.value = res.data;
            studentDetailVisible.value = true;
        } else {
            Taro.showToast({ title: res?.reason || '查询学生信息失败', icon: 'none' });
        }
    } catch (error) {
        console.error('Failed to fetch student detail:', error);
        Taro.showToast({ title: '网络请求异常', icon: 'none' });
    } finally {
        Taro.hideLoading();
    }
};

const loadFilterOptions = async () => {
    if (!selectedTerm.value?.id) return;
    if (optionsLoading.value) return;
    optionsLoading.value = true;
    try {
        const res = await getFinanceFilterOptions({
            semester: selectedTerm.value.id,
            status: filters.status,
            // 下拉选项本地按关键词过滤，这里不按关键词请求，避免必须“先查询”才有列表
            limit: 100,
        });
        if (res && res.state === 'success' && res.data) {
            courseOptions.value = res.data.courses || [];
            collegeOptions.value = res.data.colleges || [];
        } else if (res?.reason) {
            Taro.showToast({ title: res.reason, icon: 'none' });
        }
    } catch (error) {
        console.error('Failed to load filter options:', error);
    } finally {
        optionsLoading.value = false;
    }
};

const fetchOrders = async (page = 1, showLoading = false) => {
    if (!selectedTerm.value?.id) return;
    if (page === 1) orders.value = [];
    ordersLoading.value = true;
    if (showLoading) Taro.showLoading({ title: '查询中...' });
    try {
        const res = await getUnpaidOrders({
            semester: selectedTerm.value.id,
            student_name: filters.studentName || undefined,
            student_phone: filters.studentPhone || undefined,
            status: filters.status,
            course_id: filters.courseId || undefined,
            course_keyword: filters.courseKeyword || undefined,
            college_id: filters.collegeId || undefined,
            college_keyword: filters.collegeKeyword || undefined,
            page,
            page_size: ordersPageSize,
        });
        if (res && res.state === 'success' && res.data) {
            const data = res.data;
            const nextList = data.orders || [];
            orders.value = page === 1 ? nextList : [...orders.value, ...nextList];
            ordersPage.value = data.page || page;
            ordersTotal.value = data.total || nextList.length;
            ordersHasMore.value = Boolean(data.has_more);
        } else {
            Taro.showToast({ title: res?.reason || '查询失败', icon: 'none' });
        }
    } catch (error) {
        console.error('Failed to fetch orders:', error);
        Taro.showToast({ title: '网络请求异常', icon: 'none' });
    } finally {
        ordersLoading.value = false;
        if (showLoading) Taro.hideLoading();
    }
};

const refreshTermData = async (termId) => {
    if (!termId) return;
    ordersPage.value = 1;
    await loadFilterOptions();
    await fetchOrders(1);
};

const loadTerms = async () => {
    try {
        const res = await getTerms();
        if (res && res.state === 'success' && res.data.length > 0) {
            termList.value = res.data;
            selectedTerm.value = res.data[0];
            await refreshTermData(selectedTerm.value.id);
        } else {
            Taro.showToast({ title: res?.reason || '学期列表加载失败', icon: 'none' });
        }
    } catch (error) {
        console.error('Failed to load terms:', error);
        Taro.showToast({ title: '网络请求异常', icon: 'none' });
    }
};

const onTermChange = async (e) => {
    const newIndex = e.detail.value;
    selectedTerm.value = termList.value[newIndex];
    await refreshTermData(selectedTerm.value.id);
};

const navigateTerm = async (direction) => {
    const currentIndex = termList.value.findIndex(t => t.id === selectedTerm.value.id);
    const newIndex = currentIndex + direction;
    if (newIndex >= 0 && newIndex < termList.value.length) {
        selectedTerm.value = termList.value[newIndex];
        await refreshTermData(selectedTerm.value.id);
    }
};

const onCoursePick = (e) => {
    const idx = Number(e?.detail?.value);
    const item = coursePickerRange.value[idx];
    if (!item) return;
    if (!item.course_id) return;
    filters.courseId = item.course_id;
    filters.courseName = item.course_name || '';
    filters.courseKeyword = filters.courseName;
};

const onCollegePick = (e) => {
    const idx = Number(e?.detail?.value);
    const item = collegePickerRange.value[idx];
    if (!item) return;
    if (!item.college_id) return;
    filters.collegeId = item.college_id;
    filters.collegeName = item.college_name || '';
    filters.collegeKeyword = filters.collegeName;
};

watch(
    () => filters.status,
    async () => {
        // 支付状态变化会影响学校统计口径，也可能影响课程可用范围
        await loadFilterOptions();
    }
);

const onSearch = async () => {
    await loadFilterOptions();
    await fetchOrders(1, true);
};

const resetFilters = async () => {
    filters.studentName = '';
    filters.studentPhone = '';
    filters.status = 'all';
    filters.courseId = null;
    filters.courseName = '';
    filters.courseKeyword = '';
    filters.collegeId = null;
    filters.collegeName = '';
    filters.collegeKeyword = '';
    await loadFilterOptions();
    await fetchOrders(1, true);
};

const loadMore = () => {
    if (!ordersHasMore.value || ordersLoading.value) return;
    fetchOrders(ordersPage.value + 1);
};

onMounted(loadTerms);
</script>

<style lang="scss">
.finance-orders {
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

.select-row {
    display: flex;
    gap: 8px;
    align-items: center;
}

.picker-inline {
    display: flex;
    align-items: center;
}

.picker-trigger {
    display: flex;
    align-items: center;
}

.selected-value {
    margin-top: 6px;
    font-size: 14px;
    color: #666;
}

.filter-actions {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 10px;
    margin-top: 8px;
}

.filter-hint {
    margin-top: 8px;
    font-size: 12px;
    color: #888;
}

.empty-state {
    text-align: center;
    padding: 20px;
    color: #999;
    font-size: 16px;
}

.order-desc {
    display: flex;
    flex-direction: column;
    gap: 2px;
    color: #666;
}

.order-line {
    font-size: 14px;
}

.loading-text {
    text-align: center;
    color: #888;
    padding: 10px 0;
}

.detail-popup-scroll {
    height: 100%;
    padding: 12px;
    box-sizing: border-box;
}
</style>
