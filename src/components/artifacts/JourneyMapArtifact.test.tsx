import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { JourneyMapArtifact } from './JourneyMapArtifact';
import type { JourneyMapData } from './JourneyMapArtifact';

const specSample: JourneyMapData = {
  title: 'CJM: Покупка товара в интернет-магазине',
  persona: 'Мария, 28 лет, покупает кроссовки онлайн впервые',
  stages: [
    {
      name: 'Поиск',
      actions: 'Гуглит «купить кроссовки Nike», заходит на сайт',
      thoughts: 'Надеюсь, тут нормальный выбор и не обманут',
      emotion: 'neutral',
      touchpoints: ['Google', 'Главная страница'],
      pain_points: [],
    },
    {
      name: 'Выбор',
      actions: 'Фильтрует по размеру и цене, сравнивает модели',
      thoughts: 'Почему нет фильтра по цвету? Фото мелкие',
      emotion: 'negative',
      touchpoints: ['Каталог', 'Карточка товара'],
      pain_points: ['Нет фильтра по цвету', 'Маленькие фото'],
    },
    {
      name: 'Оформление',
      actions: 'Добавляет в корзину, вводит адрес, выбирает доставку',
      thoughts: 'Быстро и понятно, формы удобные',
      emotion: 'positive',
      touchpoints: ['Корзина', 'Чекаут'],
      pain_points: [],
    },
  ],
};

describe('JourneyMapArtifact', () => {
  it('renders the CJM title', () => {
    render(<JourneyMapArtifact data={specSample} />);
    expect(screen.getByText('CJM: Покупка товара в интернет-магазине')).toBeInTheDocument();
  });

  it('renders the persona description', () => {
    render(<JourneyMapArtifact data={specSample} />);
    expect(screen.getByText('Мария, 28 лет, покупает кроссовки онлайн впервые')).toBeInTheDocument();
  });

  it('renders all stage names as card headers', () => {
    render(<JourneyMapArtifact data={specSample} />);
    expect(screen.getByText('Поиск')).toBeInTheDocument();
    expect(screen.getByText('Выбор')).toBeInTheDocument();
    expect(screen.getByText('Оформление')).toBeInTheDocument();
  });

  it('renders stage actions text', () => {
    render(<JourneyMapArtifact data={specSample} />);
    expect(screen.getByText(/Гуглит «купить кроссовки Nike»/)).toBeInTheDocument();
  });

  it('renders stage thoughts in quotes', () => {
    render(<JourneyMapArtifact data={specSample} />);
    expect(screen.getByText(/"Надеюсь, тут нормальный выбор и не обманут"/)).toBeInTheDocument();
  });

  it('renders touchpoints as badges', () => {
    render(<JourneyMapArtifact data={specSample} />);
    expect(screen.getByText('Google')).toBeInTheDocument();
    expect(screen.getByText('Главная страница')).toBeInTheDocument();
    expect(screen.getByText('Каталог')).toBeInTheDocument();
    expect(screen.getByText('Карточка товара')).toBeInTheDocument();
  });

  it('renders pain points with warning prefix', () => {
    render(<JourneyMapArtifact data={specSample} />);
    expect(screen.getByText('⚠ Нет фильтра по цвету')).toBeInTheDocument();
    expect(screen.getByText('⚠ Маленькие фото')).toBeInTheDocument();
  });

  it('does not render pain point section when pain_points is empty', () => {
    const singleStage: JourneyMapData = {
      stages: [
        { name: 'Поиск', emotion: 'neutral', pain_points: [] },
      ],
    };
    render(<JourneyMapArtifact data={singleStage} />);
    expect(screen.queryByText(/⚠/)).not.toBeInTheDocument();
  });

  it('renders emotion emoji for each stage', () => {
    render(<JourneyMapArtifact data={specSample} />);
    expect(screen.getByTitle('neutral')).toBeInTheDocument();
    expect(screen.getByTitle('negative')).toBeInTheDocument();
    expect(screen.getByTitle('positive')).toBeInTheDocument();
  });

  it('renders emotion curve SVG when there are multiple stages', () => {
    const { container } = render(<JourneyMapArtifact data={specSample} />);
    expect(container.querySelector('svg')).toBeInTheDocument();
    expect(container.querySelector('polyline')).toBeInTheDocument();
  });

  it('does not render emotion curve SVG for a single stage', () => {
    const single: JourneyMapData = {
      stages: [{ name: 'Один', emotion: 'positive' }],
    };
    const { container } = render(<JourneyMapArtifact data={single} />);
    expect(container.querySelector('svg')).not.toBeInTheDocument();
  });

  it('renders without title and persona when not provided', () => {
    const noMeta: JourneyMapData = {
      stages: [{ name: 'Stage 1', emotion: 'positive' }],
    };
    render(<JourneyMapArtifact data={noMeta} />);
    expect(screen.queryByRole('heading')).not.toBeInTheDocument();
    expect(screen.getByText('Stage 1')).toBeInTheDocument();
  });
});
