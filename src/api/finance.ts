import request from '../utils/request';

export function getUnpaidOrders(params: Record<string, any>) {
    return request({
        url: '/finance/unpaid_orders',
        method: 'GET',
        data: params,
    });
}

export function getFinanceFilterOptions(params: Record<string, any>) {
    return request({
        url: '/finance/options',
        method: 'GET',
        data: params,
    });
}
