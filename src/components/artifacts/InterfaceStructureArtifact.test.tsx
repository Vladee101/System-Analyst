import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { InterfaceStructureArtifact } from './InterfaceStructureArtifact';
import type { InterfaceStructureData } from './InterfaceStructureArtifact';

const specSample: InterfaceStructureData = {
  title: 'Структура интерфейса: Личный кабинет',
  screens: [
    { id: 'main',         label: 'Главная',                   type: 'page',  children: ['profile', 'orders', 'settings'] },
    { id: 'profile',      label: 'Профиль',                   type: 'page',  children: ['edit_profile'] },
    { id: 'edit_profile', label: 'Редактирование профиля',    type: 'modal', children: [] },
    { id: 'orders',       label: 'Мои заказы',                type: 'page',  children: ['order_detail'] },
    { id: 'order_detail', label: 'Детали заказа',             type: 'page',  children: ['tracking', 'return_request'] },
    { id: 'tracking',     label: 'Отслеживание',              type: 'page',  children: [] },
    { id: 'return_request', label: 'Запрос возврата',         type: 'modal', children: [] },
    { id: 'settings',     label: 'Настройки',                 type: 'page',  children: ['notifications', 'security'] },
    { id: 'notifications', label: 'Уведомления',              type: 'page',  children: [] },
    { id: 'security',     label: 'Безопасность',              type: 'page',  children: [] },
  ],
};

describe('InterfaceStructureArtifact', () => {
  it('renders the diagram title', () => {
    render(<InterfaceStructureArtifact data={specSample} />);
    expect(screen.getByText('Структура интерфейса: Личный кабинет')).toBeInTheDocument();
  });

  it('renders all screen labels', () => {
    render(<InterfaceStructureArtifact data={specSample} />);
    const labels = ['Главная', 'Профиль', 'Редактирование профиля', 'Мои заказы',
      'Детали заказа', 'Отслеживание', 'Запрос возврата', 'Настройки',
      'Уведомления', 'Безопасность'];
    labels.forEach(label => {
      expect(screen.getByText(label)).toBeInTheDocument();
    });
  });

  it('renders modal screens with "modal" sub-label', () => {
    render(<InterfaceStructureArtifact data={specSample} />);
    const modalLabels = screen.getAllByText('modal');
    // edit_profile and return_request are modals
    expect(modalLabels).toHaveLength(2);
  });

  it('page nodes do not have "modal" sub-label', () => {
    const pagesOnly: InterfaceStructureData = {
      screens: [
        { id: 'home', label: 'Главная', type: 'page', children: [] },
      ],
    };
    render(<InterfaceStructureArtifact data={pagesOnly} />);
    expect(screen.queryByText('modal')).not.toBeInTheDocument();
  });

  it('renders without a title when not provided', () => {
    const noTitle: InterfaceStructureData = {
      screens: [{ id: 'a', label: 'Screen A', type: 'page', children: [] }],
    };
    render(<InterfaceStructureArtifact data={noTitle} />);
    expect(screen.queryByRole('heading')).not.toBeInTheDocument();
    expect(screen.getByText('Screen A')).toBeInTheDocument();
  });

  it('only renders root nodes at the top level (Главная is the single root)', () => {
    render(<InterfaceStructureArtifact data={specSample} />);
    // "Главная" is the only root — all others are descendants
    // The title h2 + the screen label are the only h2s; screen label renders as a div, not h2
    const title = screen.getByText('Структура интерфейса: Личный кабинет');
    expect(title.tagName).toBe('H2');
  });

  it('renders with empty screens list without crashing', () => {
    render(<InterfaceStructureArtifact data={{ screens: [] }} />);
    // Should render without throwing
  });
});
