import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { CallbackSuccessCard } from './CallbackSuccessCard';

describe('CallbackSuccessCard', () => {
  it('renders login success message', () => {
    render(<CallbackSuccessCard flowType="login" userName="Alice" autoCloseDelay={10} />);
    expect(screen.getByText('Sign In Successful!')).toBeInTheDocument();
    expect(screen.getByText(/Welcome back, Alice/)).toBeInTheDocument();
  });

  it('calls onClose when Close Now clicked', async () => {
    const onClose = vi.fn();
    const user = (await import('@testing-library/user-event')).default.setup();
    render(<CallbackSuccessCard onClose={onClose} autoCloseDelay={10} />);
    await user.click(screen.getByRole('button', { name: /close now/i }));
    expect(onClose).toHaveBeenCalled();
  });
});
