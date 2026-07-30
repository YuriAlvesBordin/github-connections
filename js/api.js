const API_BASE = 'https://api.github.com';

export async function fetchFollowers(username) {
    const response = await fetch(`${API_BASE}/users/${username}/followers`);
    if (!response.ok) throw new Error('Failed to fetch followers');
    return response.json();
}

export async function fetchFollowing(username) {
    const response = await fetch(`${API_BASE}/users/${username}/following`);
    if (!response.ok) throw new Error('Failed to fetch following');
    return response.json();
}
