Workspace này gồm hai service Express nhỏ dùng để minh hoạ các mẫu chịu lỗi (fault-tolerance patterns):

Service B (downstream) – service-b (cổng 3001)
— có endpoint /unstable mô phỏng hành vi thất bại ngẫu nhiên hoặc phản hồi chậm.

Service A (client) – service-a (cổng 3000)
— gọi Service B và áp dụng các chính sách phía client như: retry, circuit breaker, rate limiter, bulkhead.

Trong postman hoặc dùng curl:

# kích hoạt 5 lần gọi
curl "http://localhost:3000/call?count=5"

Sẽ thấy response và log hiển thị:

sự thay đổi trạng thái của circuit breaker

các lần retry

hành vi rate limiting

Ghi chú

service-a sử dụng:

bottleneck để giới hạn tốc độ request phía client (rate limiter)

p-limit để giới hạn số request xử lý đồng thời (bulkhead / concurrency limit)

promise-retry để thực hiện retry khi lỗi

opossum để triển khai circuit breaker

số lượng request đồng thời
nhằm thử nghiệm các kịch bản chịu lỗi khác nhau.
