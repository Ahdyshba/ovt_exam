const API_URL = 'http://exam-api-courses.std-900.ist.mospolytech.ru';
const API_KEY = 'abfc21f8-992e-47dc-96fd-bbabdddc0c7f';

class SchoolAPI {
    constructor() {
        this.key = API_KEY;
    }

    async _request(endpoint, method = 'GET', data = null) {
        if (!this.key) {
            throw new Error('API ключ не настроен');
        }

        const url = new URL(`${API_URL}${endpoint}`);
        url.searchParams.append('api_key', this.key);

        const config = {
            method,
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            },
            mode: 'cors'
        };

        if (data && (method === 'POST' || method === 'PUT')) {
            config.body = JSON.stringify(data);
        }

        const response = await fetch(url, config);
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || `Ошибка ${response.status}`);
        }

        return response.json();
    }

    async getCourses() {
        return this._request('/api/courses');
    }

    async getCourse(id) {
        if (!id) throw new Error('ID курса не указан');
        return this._request(`/api/course/${id}`);
    }

    async getTutors() {
        return this._request('/api/tutors');
    }

    async getTutor(id) {
        if (!id) throw new Error('ID репетитора не указан');
        return this._request(`/api/tutors/${id}`);
    }

    async getOrders() {
        return this._request('/api/orders');
    }

    async getOrder(id) {
        if (!id) throw new Error('ID заявки не указан');
        return this._request(`/api/orders/${id}`);
    }

    async addOrder(orderData) {
        if (!orderData) throw new Error('Данные заявки не указаны');
        
        const required = ['date_start', 'time_start', 'persons', 'price'];
        for (const field of required) {
            if (orderData[field] === undefined || orderData[field] === null) {
                throw new Error(`Не заполнено поле: ${field}`);
            }
        }

        const hasCourse = orderData.course_id && orderData.course_id > 0;
        const hasTutor = orderData.tutor_id && orderData.tutor_id > 0;
        
        if (!hasCourse && !hasTutor) {
            throw new Error('Выберите курс или репетитора');
        }
        if (hasCourse && hasTutor) {
            throw new Error('Можно выбрать только курс или репетитора!');
        }

        const processedData = {
            ...orderData,
            early_registration: Boolean(orderData.early_registration),
            group_enrollment: Boolean(orderData.group_enrollment),
            intensive_course: Boolean(orderData.intensive_course),
            supplementary: Boolean(orderData.supplementary),
            personalized: Boolean(orderData.personalized),
            excursions: Boolean(orderData.excursions),
            assessment: Boolean(orderData.assessment),
            interactive: Boolean(orderData.interactive)
        };
        
        return this._request('/api/orders', 'POST', processedData);
    }

    async updateOrder(orderId, orderData) {
        if (!orderId) throw new Error('ID заявки не указан');
        return this._request(`/api/orders/${orderId}`, 'PUT', orderData);
    }

    async deleteOrder(orderId) {
        if (!orderId) throw new Error('ID заявки не указан!');
        return this._request(`/api/orders/${orderId}`, 'DELETE');
    }
}

const schoolAPI = new SchoolAPI();