import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { AdrArtifact } from './AdrArtifact';

const specSample = {
  title: 'ADR-001: Выбор PostgreSQL вместо MongoDB',
  status: 'Accepted',
  date: '2024-03-15',
  context: 'Нужна БД для хранения заказов. Данные структурированы, нужны JOIN-ы для отчётов.',
  decision: 'Используем PostgreSQL — реляционная модель подходит для структурированных данных с отчётами.',
  consequences: [
    'Плюс: ACID-транзакции для финансовых операций',
    'Плюс: Зрелая экосистема, знакомство команды',
    'Минус: Горизонтальное масштабирование сложнее, чем у MongoDB',
    'Минус: Изменение схемы требует миграций',
  ],
};

describe('AdrArtifact', () => {
  it('renders the ADR title', () => {
    render(<AdrArtifact data={specSample} />);
    expect(screen.getByText(specSample.title)).toBeInTheDocument();
  });

  it('renders the status badge with green styling for Accepted', () => {
    render(<AdrArtifact data={specSample} />);
    const badge = screen.getByText('Accepted');
    expect(badge).toBeInTheDocument();
    expect(badge.className).toMatch(/bg-green/);
  });

  it('renders the date', () => {
    render(<AdrArtifact data={specSample} />);
    expect(screen.getByText(/2024-03-15/)).toBeInTheDocument();
  });

  it('renders the context section', () => {
    render(<AdrArtifact data={specSample} />);
    expect(screen.getByText(/Нужна БД для хранения заказов/)).toBeInTheDocument();
  });

  it('renders the decision section', () => {
    render(<AdrArtifact data={specSample} />);
    expect(screen.getByText(/Используем PostgreSQL/)).toBeInTheDocument();
  });

  it('renders consequences with + prefix for Плюс items', () => {
    render(<AdrArtifact data={specSample} />);
    const plusMarkers = screen.getAllByText('+');
    expect(plusMarkers).toHaveLength(2);
  });

  it('renders consequences with − prefix for Минус items', () => {
    render(<AdrArtifact data={specSample} />);
    const minusMarkers = screen.getAllByText('−');
    expect(minusMarkers).toHaveLength(2);
  });

  it('strips Плюс:/Минус: prefix from consequence text', () => {
    render(<AdrArtifact data={specSample} />);
    expect(screen.getByText('ACID-транзакции для финансовых операций')).toBeInTheDocument();
    expect(screen.getByText('Изменение схемы требует миграций')).toBeInTheDocument();
  });

  it('applies yellow badge for Proposed status', () => {
    render(<AdrArtifact data={{ ...specSample, status: 'Proposed' }} />);
    const badge = screen.getByText('Proposed');
    expect(badge.className).toMatch(/bg-yellow/);
  });

  it('applies red badge for Deprecated status', () => {
    render(<AdrArtifact data={{ ...specSample, status: 'Deprecated' }} />);
    const badge = screen.getByText('Deprecated');
    expect(badge.className).toMatch(/bg-red/);
  });

  it('renders without optional fields (date, context, decision, consequences)', () => {
    render(<AdrArtifact data={{ title: 'ADR-002', status: 'Proposed' }} />);
    expect(screen.getByText('ADR-002')).toBeInTheDocument();
    expect(screen.queryByText(/Дата:/)).not.toBeInTheDocument();
    expect(screen.queryByText('Контекст')).not.toBeInTheDocument();
    expect(screen.queryByText('Решение')).not.toBeInTheDocument();
    expect(screen.queryByText('Последствия')).not.toBeInTheDocument();
  });
});
