
.video-card {
  width: 100%;
  max-width: 600px;
  margin: 24px auto;
  background: #15151d;
  border: 1px solid #292936;
  border-radius: 16px;
  overflow: hidden;
  color: #fff;
}

.video-card-header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 15px;
}

.video-user-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.video-user-info span {
  color: #aaa;
  font-size: 12px;
}

.video-stage {
  width: 100%;
  background: #000;
  overflow: hidden;
}

.video-stage video {
  display: block;
  width: 100%;
  max-height: 650px;
  object-fit: contain;
  background: #000;
}

.video-caption {
  padding: 14px 16px;
  line-height: 1.5;
  color: #eee;
}

.video-actions {
  display: flex;
  align-items: center;
  justify-content: space-around;
  flex-wrap: wrap;
  gap: 8px;
  padding: 12px;
  border-top: 1px solid #292936;
}

.video-actions .action-btn {
  background: transparent;
  border: none;
  color: #ccc;
  cursor: pointer;
  padding: 8px;
}

.video-actions .action-btn:hover,
.video-actions .action-btn.liked {
  color: #ff3b75;
}

.video-error {
  padding: 30px;
  text-align: center;
  color: #fff;
  background: #09090d;
}
