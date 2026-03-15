package helper

import (
	"context"
	"encoding/json"
	"fmt"
	"sync"
	"time"

	"github.com/aisales/backend/models"
	"github.com/redis/go-redis/v9"
)

// Queue defines the interface for email job queuing.
type Queue interface {
	Enqueue(ctx context.Context, queue string, job models.EmailJob) error
	EnqueueDelayed(ctx context.Context, queue string, job models.EmailJob, delay time.Duration) error
	Dequeue(ctx context.Context, queue string, timeout time.Duration) (*models.EmailJob, error)
	ProcessDelayed(ctx context.Context, queue string) (int, error)
	GetQueueLength(ctx context.Context, queue string) (int64, error)
	IncrCounter(ctx context.Context, key string) error
	GetCounter(ctx context.Context, key string) (int64, error)
	SetWithExpiry(ctx context.Context, key string, value string, expiry time.Duration) error
	Close() error
}

// NewQueue returns a Redis-backed queue, or in-memory queue for development.
func NewQueue(redisURL, environment string) (Queue, error) {
	q, err := NewRedisQueue(redisURL)
	if err == nil {
		return q, nil
	}
	if environment == "development" {
		return NewMemoryQueue(), nil
	}
	return nil, fmt.Errorf("connect redis: %w", err)
}

// ─── Redis Queue ─────────────────────────────────────────────────────────────

type RedisQueue struct {
	client *redis.Client
}

func NewRedisQueue(redisURL string) (*RedisQueue, error) {
	opts, err := redis.ParseURL(redisURL)
	if err != nil {
		return nil, fmt.Errorf("parse redis URL: %w", err)
	}
	client := redis.NewClient(opts)
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	if err := client.Ping(ctx).Err(); err != nil {
		return nil, fmt.Errorf("ping redis: %w", err)
	}
	return &RedisQueue{client: client}, nil
}

func (q *RedisQueue) Enqueue(ctx context.Context, queue string, job models.EmailJob) error {
	payload, err := json.Marshal(job)
	if err != nil {
		return fmt.Errorf("marshal job: %w", err)
	}
	return q.client.RPush(ctx, queue, payload).Err()
}

func (q *RedisQueue) EnqueueDelayed(ctx context.Context, queue string, job models.EmailJob, delay time.Duration) error {
	payload, err := json.Marshal(job)
	if err != nil {
		return fmt.Errorf("marshal job: %w", err)
	}
	score := float64(time.Now().Add(delay).UnixNano())
	return q.client.ZAdd(ctx, queue+":delayed", redis.Z{Score: score, Member: payload}).Err()
}

func (q *RedisQueue) Dequeue(ctx context.Context, queue string, timeout time.Duration) (*models.EmailJob, error) {
	result, err := q.client.BLPop(ctx, timeout, queue).Result()
	if err == redis.Nil {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("dequeue: %w", err)
	}
	var job models.EmailJob
	if err := json.Unmarshal([]byte(result[1]), &job); err != nil {
		return nil, fmt.Errorf("unmarshal job: %w", err)
	}
	return &job, nil
}

func (q *RedisQueue) ProcessDelayed(ctx context.Context, queue string) (int, error) {
	now := float64(time.Now().UnixNano())
	results, err := q.client.ZRangeByScoreWithScores(ctx, queue+":delayed", &redis.ZRangeBy{
		Min: "0",
		Max: fmt.Sprintf("%f", now),
	}).Result()
	if err != nil {
		return 0, err
	}
	count := 0
	for _, z := range results {
		payload := []byte(z.Member.(string))
		pipe := q.client.TxPipeline()
		pipe.ZRem(ctx, queue+":delayed", z.Member)
		pipe.RPush(ctx, queue, payload)
		if _, err := pipe.Exec(ctx); err != nil {
			continue
		}
		count++
	}
	return count, nil
}

func (q *RedisQueue) GetQueueLength(ctx context.Context, queue string) (int64, error) {
	return q.client.LLen(ctx, queue).Result()
}

func (q *RedisQueue) IncrCounter(ctx context.Context, key string) error {
	return q.client.Incr(ctx, key).Err()
}

func (q *RedisQueue) GetCounter(ctx context.Context, key string) (int64, error) {
	val, err := q.client.Get(ctx, key).Int64()
	if err == redis.Nil {
		return 0, nil
	}
	return val, err
}

func (q *RedisQueue) SetWithExpiry(ctx context.Context, key string, value string, expiry time.Duration) error {
	return q.client.Set(ctx, key, value, expiry).Err()
}

func (q *RedisQueue) Close() error { return q.client.Close() }

// ─── Memory Queue (development fallback) ─────────────────────────────────────

type delayedJob struct {
	job   models.EmailJob
	runAt time.Time
}

type storedValue struct {
	value     string
	expiresAt time.Time
}

type MemoryQueue struct {
	mu       sync.Mutex
	queues   map[string][]models.EmailJob
	delayed  map[string][]delayedJob
	counters map[string]int64
	values   map[string]storedValue
}

func NewMemoryQueue() *MemoryQueue {
	return &MemoryQueue{
		queues:   make(map[string][]models.EmailJob),
		delayed:  make(map[string][]delayedJob),
		counters: make(map[string]int64),
		values:   make(map[string]storedValue),
	}
}

func (q *MemoryQueue) Enqueue(_ context.Context, queue string, job models.EmailJob) error {
	q.mu.Lock()
	defer q.mu.Unlock()
	q.queues[queue] = append(q.queues[queue], job)
	return nil
}

func (q *MemoryQueue) EnqueueDelayed(_ context.Context, queue string, job models.EmailJob, delay time.Duration) error {
	q.mu.Lock()
	defer q.mu.Unlock()
	q.delayed[queue] = append(q.delayed[queue], delayedJob{job: job, runAt: time.Now().Add(delay)})
	return nil
}

func (q *MemoryQueue) Dequeue(ctx context.Context, queue string, timeout time.Duration) (*models.EmailJob, error) {
	deadline := time.Now().Add(timeout)
	for {
		q.mu.Lock()
		if jobs := q.queues[queue]; len(jobs) > 0 {
			job := jobs[0]
			q.queues[queue] = jobs[1:]
			q.mu.Unlock()
			return &job, nil
		}
		q.mu.Unlock()
		if timeout > 0 && time.Now().After(deadline) {
			return nil, nil
		}
		select {
		case <-ctx.Done():
			return nil, ctx.Err()
		case <-time.After(100 * time.Millisecond):
		}
	}
}

func (q *MemoryQueue) ProcessDelayed(_ context.Context, queue string) (int, error) {
	q.mu.Lock()
	defer q.mu.Unlock()
	now := time.Now()
	items := q.delayed[queue]
	var remaining []delayedJob
	count := 0
	for _, item := range items {
		if !item.runAt.After(now) {
			q.queues[queue] = append(q.queues[queue], item.job)
			count++
		} else {
			remaining = append(remaining, item)
		}
	}
	q.delayed[queue] = remaining
	return count, nil
}

func (q *MemoryQueue) GetQueueLength(_ context.Context, queue string) (int64, error) {
	q.mu.Lock()
	defer q.mu.Unlock()
	return int64(len(q.queues[queue])), nil
}

func (q *MemoryQueue) IncrCounter(_ context.Context, key string) error {
	q.mu.Lock()
	defer q.mu.Unlock()
	q.counters[key]++
	return nil
}

func (q *MemoryQueue) GetCounter(_ context.Context, key string) (int64, error) {
	q.mu.Lock()
	defer q.mu.Unlock()
	return q.counters[key], nil
}

func (q *MemoryQueue) SetWithExpiry(_ context.Context, key string, value string, expiry time.Duration) error {
	q.mu.Lock()
	defer q.mu.Unlock()
	q.values[key] = storedValue{value: value, expiresAt: time.Now().Add(expiry)}
	return nil
}

func (q *MemoryQueue) Close() error { return nil }
