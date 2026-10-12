from locust import HttpUser, between, task


class NurtureHerUser(HttpUser):
    wait_time = between(1, 3)

    @task
    def health(self):
        self.client.get("/health")

    @task
    def docs(self):
        self.client.get("/openapi.json")

