"""
WMS API Client — handles all communication with the warehouse management system.
"""
import httpx
import logging
from datetime import datetime
from typing import Optional
from config import settings

logger = logging.getLogger(__name__)

WMS_API_URL = settings.WMS_API_BASE_URL
USER_TOKEN = settings.WMS_USER_TOKEN
DEFAULT_PAGE_SIZE = settings.DEFAULT_PAGE_SIZE


class WMSClient:
    """Async HTTP client for the WMS API."""

    def __init__(self, base_url: str = WMS_API_URL, user_token: str = USER_TOKEN):
        self.base_url = base_url
        self.user_token = user_token

    async def _request(self, payload: dict) -> dict:
        """Send a POST request to the WMS API."""
        payload["user_token"] = self.user_token
        async with httpx.AsyncClient(timeout=60.0) as client:
            resp = await client.post(self.base_url, json=payload)
            resp.raise_for_status()
            data = resp.json()
            if data.get("ask") != "Success":
                raise Exception(f"WMS API error: {data.get('message', 'Unknown error')}")
            return data

    # -------------------------------------------------------------------------
    # Outbound Orders (Dropshipping)
    # -------------------------------------------------------------------------
    async def get_order_list(
        self,
        create_time_from: Optional[str] = None,
        create_time_to: Optional[str] = None,
        ship_time_from: Optional[str] = None,
        ship_time_to: Optional[str] = None,
        order_code: Optional[str] = None,
        order_code_arr: Optional[list[str]] = None,
        page: int = 1,
        page_size: int = DEFAULT_PAGE_SIZE,
    ) -> dict:
        """Fetch outbound/dropshipping orders."""
        payload = {
            "service": "getOrderList",
            "page": page,
            "pageSize": page_size,
        }
        if create_time_from:
            payload["createTimeFrom"] = create_time_from
        if create_time_to:
            payload["createTimeTo"] = create_time_to
        if ship_time_from:
            payload["shipTimeFrom"] = ship_time_from
        if ship_time_to:
            payload["shipTimeTo"] = ship_time_to
        if order_code:
            payload["order_code"] = order_code
        if order_code_arr:
            payload["order_code_arr"] = order_code_arr

        return await self._request(payload)

    async def get_all_orders(
        self,
        create_time_from: Optional[str] = None,
        create_time_to: Optional[str] = None,
        ship_time_from: Optional[str] = None,
        ship_time_to: Optional[str] = None,
        page_size: int = DEFAULT_PAGE_SIZE,
    ) -> list[dict]:
        """Fetch ALL outbound orders with pagination."""
        all_data = []
        page = 1
        while True:
            result = await self.get_order_list(
                create_time_from=create_time_from,
                create_time_to=create_time_to,
                ship_time_from=ship_time_from,
                ship_time_to=ship_time_to,
                page=page,
                page_size=page_size,
            )
            data = result.get("data", [])
            all_data.extend(data)
            total = int(result.get("totalCount", 0))
            logger.info(f"Outbound orders: fetched page {page}, got {len(data)}, total={total}")
            if len(all_data) >= total or not data:
                break
            page += 1
        return all_data

    # -------------------------------------------------------------------------
    # Inbound Receiving
    # -------------------------------------------------------------------------
    async def get_receiving_list(
        self,
        create_time_from: Optional[str] = None,
        create_time_to: Optional[str] = None,
        date_shelves_from: Optional[str] = None,
        date_shelves_to: Optional[str] = None,
        order_code: Optional[str] = None,
        order_code_arr: Optional[list[str]] = None,
        page: int = 1,
        page_size: int = DEFAULT_PAGE_SIZE,
    ) -> dict:
        """Fetch inbound receiving orders."""
        payload = {
            "service": "getReceivingListForYB",
            "page": page,
            "pageSize": page_size,
        }
        if create_time_from:
            payload["createTimeFrom"] = create_time_from
        if create_time_to:
            payload["createTimeTo"] = create_time_to
        if date_shelves_from:
            payload["dateShelvesFrom"] = date_shelves_from
        if date_shelves_to:
            payload["dateShelvesTo"] = date_shelves_to
        if order_code:
            payload["order_code"] = order_code
        if order_code_arr:
            payload["order_code_arr"] = order_code_arr

        return await self._request(payload)

    async def get_all_receivings(
        self,
        create_time_from: Optional[str] = None,
        create_time_to: Optional[str] = None,
        date_shelves_from: Optional[str] = None,
        date_shelves_to: Optional[str] = None,
        page_size: int = DEFAULT_PAGE_SIZE,
    ) -> list[dict]:
        """Fetch ALL inbound receivings with pagination."""
        all_data = []
        page = 1
        while True:
            result = await self.get_receiving_list(
                create_time_from=create_time_from,
                create_time_to=create_time_to,
                date_shelves_from=date_shelves_from,
                date_shelves_to=date_shelves_to,
                page=page,
                page_size=page_size,
            )
            data = result.get("data", [])
            all_data.extend(data)
            total = int(result.get("totalCount", 0))
            logger.info(f"Inbound receivings: fetched page {page}, got {len(data)}, total={total}")
            if len(all_data) >= total or not data:
                break
            page += 1
        return all_data

    # -------------------------------------------------------------------------
    # Product List
    # -------------------------------------------------------------------------
    async def get_product_list(
        self,
        page: int = 1,
        page_size: int = DEFAULT_PAGE_SIZE,
    ) -> dict:
        """Fetch product master data."""
        payload = {
            "service": "getProductList",
            "page": page,
            "pageSize": page_size,
        }
        return await self._request(payload)

    async def get_all_products(self, page_size: int = DEFAULT_PAGE_SIZE) -> list[dict]:
        """Fetch ALL products with pagination."""
        all_data = []
        page = 1
        while True:
            result = await self.get_product_list(page=page, page_size=page_size)
            data = result.get("data", [])
            all_data.extend(data)
            total = int(result.get("totalCount", 0))
            logger.info(f"Products: fetched page {page}, got {len(data)}, total={total}")
            if len(all_data) >= total or not data:
                break
            page += 1
        return all_data


# Singleton
wms_client = WMSClient()
