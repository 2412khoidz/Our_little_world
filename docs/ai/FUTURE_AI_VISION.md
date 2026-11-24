# Tầm nhìn AI Tương lai — Future AI World (`FUTURE_AI_VISION`)

*Tài liệu định hướng dài hạn (**Phase 5**). Không tích hợp LLM, Vector DB hay multi-agent runtime trong các milestone tới và bao gồm **V1.0** để bảo vệ ngân sách `0₫` và giữ codebase gọn sạch.*

---

## 1. Bốn Cấp độ Tiến hóa Trí tuệ Thế giới

| Cấp độ | Mốc dự kiến | Công nghệ lõi | Trải nghiệm mang lại |
|---|---|---|---|
| **Level 1 — Living World** | `V0.1.5 – V0.2.3` | Utility AI, Finite State Machine, NPC schedules & hội thoại viết sẵn | Mèo tự ăn/ngủ/chơi/quấn chủ; NPC đi bán hàng đúng giờ mà chi phí API `= 0₫`. |
| **Level 2 — Intelligent World** | `V0.2.3 – V0.5` | Personality weights, bounded typed memory, preferences, event reactions | Mèo nhớ món khoái khẩu, góc trốn riêng, thái độ gắn bó với từng người. |
| **Level 3 — Generative World** | **Thử nghiệm sau V1.0 nếu được duyệt** | Hybrid LLM Brain: planning ngắn hạn, hội thoại NPC động, nhiệm vụ theo ngữ cảnh | NPC làng phản hồi tự nhiên về mùa màng/sự kiện cặp đôi; Utility AI làm fallback. |
| **Level 4 — Autonomous Society** | **Sau `V1.0`** | Multi-agent simulation (kiểu *AI Town*), NPC tự giao tiếp & tổ chức hội chợ | Ngôi làng nhỏ sống động độc lập khi hai bạn vào thăm cùng nhau. |

---

## 2. Kiến trúc Ranh giới Cứng & An toàn Chi phí (`K7`)

```text
[Context Tối giản (World/NPC Events)] ──► [LlmPlannerInterface (Allowlist + JSON Schema)]
                                                  │ (chỉ chọn action & dialogue)
                                                  ▼
[Game Engine & Postgres RPC] ◄── Validate + Kiểm soát Tiền / Kho / Pathfinding / Animation
```

- **Quyền lực tuyệt đối ở Engine/Server:** LLM **không bao giờ** được tự tạo xu, sinh item, sửa inventory hay đổi DB trực tiếp; mọi hành động xuất ra phải nằm trong danh sách `ActionAllowlist` và đi qua cùng RPC xác thực.
- **Mèo vẫn là mèo:** Khi nâng cấp lên Hybrid Brain ở `V1.0+`, LLM chỉ gợi ý ý định cấp cao (ví dụ *tò mò chạy ra cửa khi trời mưa*) để biểu cảm bằng anim mèo — **tuyệt đối không biến thú cưng thành chatbot nói tiếng người**.
- **Provider-Agnostic & Ngân sách:**
  - Giao diện `LlmProvider` hỗ trợ gọi **DeepSeek API** (suy luận theo sự kiện hiếm hoi, chỉ sau phê duyệt chi phí, có `CostTracker` theo dõi ngưỡng thử nghiệm giả định `\$1–\$3/tháng` cần đo thực tế mới mở) hoặc **Model local nhỏ `1B–8B`** (`Ollama` / `LM Studio` / `llama.cpp`) tận dụng máy laptop dev **RTX 4060 Laptop 8GB VRAM / RAM 32GB** khi bật host.
  - Luôn giữ **`UtilityAiBrain` làm fallback mặc định** khi offline, hết quota hoặc tắt local model.
- **Bảo mật Quyền riêng tư:** **TUYỆT ĐỐI KHÔNG** gửi nội dung nhật ký cặp đôi, ảnh album riêng tư, tên thật hay dữ liệu ngoài ngữ cảnh game tới bất kỳ API LLM bên ngoài nào.

---

## 3. Tài liệu Tham khảo Lưu trữ Nghiên cứu Sau (Chưa Phân tích Sâu)
- **AI Town:** `https://github.com/a16z-infra/ai-town`
- **Generative Agents (codebase & paper):** `https://github.com/joonspk-research/generative_agents` · `https://arxiv.org/abs/2304.03442`
- **Smallville Agents:** `https://github.com/andres-villavicencio-dev/smallville-agents`
- **LLMville:** `https://github.com/dyang195/llmville`
- **Agent Sandbox:** `https://github.com/ccb/agent-sandbox`
