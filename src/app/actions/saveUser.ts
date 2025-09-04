"use server";

import pool from "@/lib/db";

export const saveUserToDatabase = async (user: {
  id: string;
  name: string | null;
}) => {
  const client = await pool.connect();

  try {
    // 既存ユーザーの確認
    const result = await client.query(
      "SELECT * FROM users WHERE id = $1",
      [user.id]
    );
    const existingUser = result.rows[0];

    if (existingUser) {
      // 名前がまだ未設定、または同じ値なら更新
      if (!existingUser.name || existingUser.name === user.name) {
        await client.query(
          `UPDATE users
           SET name = $2
           WHERE id = $1`,
          [user.id, user.name]
        );
      }
    } else {
      // 新規ユーザーを作成
      await client.query(
        "INSERT INTO users (id, name) VALUES ($1, $2)",
        [user.id, user.name]
      );
    }
  } finally {
    client.release();
  }
};
