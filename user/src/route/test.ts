import { Router } from 'express';

const router = Router();

/**
 * 컴포넌트 테스트 페이지
 */
router.get('/component', (req, res) => {
    res.render('test/component-test', {
        title: '컴포넌트 테스트 페이지'
    });
});

export default router; 