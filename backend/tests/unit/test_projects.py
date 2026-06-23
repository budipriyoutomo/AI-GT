"""
🔴 RED phase — test projects endpoint.
"""
import uuid
from unittest.mock import patch

from httpx import AsyncClient

from app.models.project import Project


class TestListProjects:
    async def test_list_projects_success(
        self, client: AsyncClient, auth_headers: dict, project: Project
    ):
        res = await client.get("/api/v1/projects", headers=auth_headers)
        assert res.status_code == 200
        body = res.json()
        assert body["success"] is True
        assert len(body["data"]) == 1
        assert body["data"][0]["title"] == "Kampanye Lebaran"

    async def test_list_projects_empty(self, client: AsyncClient, auth_headers: dict):
        res = await client.get("/api/v1/projects", headers=auth_headers)
        assert res.status_code == 200
        assert res.json()["data"] == []

    async def test_list_projects_only_own(
        self,
        client: AsyncClient,
        other_auth_headers: dict,
        project: Project,
    ):
        """User lain tidak melihat project orang lain."""
        res = await client.get("/api/v1/projects", headers=other_auth_headers)
        assert res.status_code == 200
        assert res.json()["data"] == []

    async def test_list_projects_no_auth(self, client: AsyncClient):
        res = await client.get("/api/v1/projects")
        assert res.status_code == 401


class TestGetProject:
    async def test_get_project_success(
        self, client: AsyncClient, auth_headers: dict, project: Project
    ):
        res = await client.get(f"/api/v1/projects/{project.id}", headers=auth_headers)
        assert res.status_code == 200
        body = res.json()
        assert body["success"] is True
        assert body["data"]["id"] == str(project.id)
        assert body["data"]["title"] == "Kampanye Lebaran"
        assert "final_config" in body["data"]

    async def test_get_project_not_found(self, client: AsyncClient, auth_headers: dict):
        res = await client.get(f"/api/v1/projects/{uuid.uuid4()}", headers=auth_headers)
        assert res.status_code == 404

    async def test_get_project_forbidden(
        self, client: AsyncClient, other_auth_headers: dict, project: Project
    ):
        res = await client.get(f"/api/v1/projects/{project.id}", headers=other_auth_headers)
        assert res.status_code == 403

    async def test_get_project_no_auth(self, client: AsyncClient, project: Project):
        res = await client.get(f"/api/v1/projects/{project.id}")
        assert res.status_code == 401


class TestUpdateProject:
    async def test_update_project_title_success(
        self, client: AsyncClient, auth_headers: dict, project: Project
    ):
        res = await client.patch(
            f"/api/v1/projects/{project.id}",
            headers=auth_headers,
            json={"title": "Kampanye Lebaran Updated"},
        )
        assert res.status_code == 200
        body = res.json()
        assert body["success"] is True
        assert body["data"]["title"] == "Kampanye Lebaran Updated"

    async def test_update_project_final_config(
        self, client: AsyncClient, auth_headers: dict, project: Project
    ):
        new_config = {"copy": {"headline": "Updated Headline", "body": "New body", "cta": "Buy Now"}, "typography": {}}
        res = await client.patch(
            f"/api/v1/projects/{project.id}",
            headers=auth_headers,
            json={"final_config": new_config},
        )
        assert res.status_code == 200
        assert res.json()["data"]["final_config"]["copy"]["headline"] == "Updated Headline"

    async def test_update_project_not_found(self, client: AsyncClient, auth_headers: dict):
        res = await client.patch(
            f"/api/v1/projects/{uuid.uuid4()}",
            headers=auth_headers,
            json={"title": "Ghost"},
        )
        assert res.status_code == 404

    async def test_update_project_forbidden(
        self, client: AsyncClient, other_auth_headers: dict, project: Project
    ):
        res = await client.patch(
            f"/api/v1/projects/{project.id}",
            headers=other_auth_headers,
            json={"title": "Hacked"},
        )
        assert res.status_code == 403

    async def test_update_project_no_auth(self, client: AsyncClient, project: Project):
        res = await client.patch(f"/api/v1/projects/{project.id}", json={"title": "X"})
        assert res.status_code == 401


class TestDeleteProject:
    async def test_delete_project_success(
        self, client: AsyncClient, auth_headers: dict, project: Project
    ):
        res = await client.delete(f"/api/v1/projects/{project.id}", headers=auth_headers)
        assert res.status_code == 200
        assert res.json()["success"] is True

        get_res = await client.get(f"/api/v1/projects/{project.id}", headers=auth_headers)
        assert get_res.status_code == 404

    async def test_delete_project_not_found(self, client: AsyncClient, auth_headers: dict):
        res = await client.delete(f"/api/v1/projects/{uuid.uuid4()}", headers=auth_headers)
        assert res.status_code == 404

    async def test_delete_project_forbidden(
        self, client: AsyncClient, other_auth_headers: dict, project: Project
    ):
        res = await client.delete(f"/api/v1/projects/{project.id}", headers=other_auth_headers)
        assert res.status_code == 403

    async def test_delete_project_no_auth(self, client: AsyncClient, project: Project):
        res = await client.delete(f"/api/v1/projects/{project.id}")
        assert res.status_code == 401


class TestExportProject:
    async def test_export_project_success(
        self, client: AsyncClient, auth_headers: dict, project: Project
    ):
        fake_url = "https://r2.example.com/permanent/exported/user/project/export.png"
        with patch("app.services.project_service.storage_service.upload_exported", return_value=fake_url):
            res = await client.post(
                f"/api/v1/projects/{project.id}/export",
                headers=auth_headers,
                files={"file": ("export.png", b"fake-png-data", "image/png")},
            )
        assert res.status_code == 200
        body = res.json()
        assert body["success"] is True
        assert body["data"]["is_exported"] is True
        assert body["data"]["exported_image_url"] == fake_url

    async def test_export_project_not_found(self, client: AsyncClient, auth_headers: dict):
        with patch("app.services.project_service.storage_service.upload_exported", return_value="https://r2.example.com/x.png"):
            res = await client.post(
                f"/api/v1/projects/{uuid.uuid4()}/export",
                headers=auth_headers,
                files={"file": ("export.png", b"data", "image/png")},
            )
        assert res.status_code == 404

    async def test_export_project_forbidden(
        self, client: AsyncClient, other_auth_headers: dict, project: Project
    ):
        with patch("app.services.project_service.storage_service.upload_exported", return_value="https://r2.example.com/x.png"):
            res = await client.post(
                f"/api/v1/projects/{project.id}/export",
                headers=other_auth_headers,
                files={"file": ("export.png", b"data", "image/png")},
            )
        assert res.status_code == 403

    async def test_export_project_no_auth(self, client: AsyncClient, project: Project):
        res = await client.post(
            f"/api/v1/projects/{project.id}/export",
            files={"file": ("export.png", b"data", "image/png")},
        )
        assert res.status_code == 401
